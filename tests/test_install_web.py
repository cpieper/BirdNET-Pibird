"""Exercise installer build cleanup without touching real services or npm."""
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


class TestFrontendInstaller(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        frontend = self.root / 'frontend'
        frontend.mkdir()
        (frontend / 'package-lock.json').write_text('{}')
        installer = Path(__file__).resolve().parents[1] / 'scripts/install_web.sh'
        self.library = self.root / 'installer.sh'
        self.library.write_text(installer.read_text().split('# Run main\n')[0])
        bin_dir = self.root / 'bin'
        bin_dir.mkdir()
        commands = {
            'sudo': 'exec "$@"',
            'systemctl': '''case "$1" in
  list-unit-files) echo "$2 enabled" ;;
  is-active) case "$3" in birdnet-web|birdnet_analysis) exit 0 ;; *) exit 3 ;; esac ;;
  stop|start) echo "$1 $2" >> "$TEST_SERVICE_LOG" ;;
  *) exit 1 ;;
esac''',
            'npm': '''echo "$*" >> "$TEST_NPM_LOG"
if [ "$1" = "$TEST_NPM_FAIL" ]; then
  case " $* " in *" --silent "*) ;; *) echo "Dependency/build failure" >&2 ;; esac
  exit 42
fi''',
        }
        for name, body in commands.items():
            path = bin_dir / name
            path.write_text('#!/usr/bin/env bash\n' + body + '\n')
            path.chmod(0o755)
        self.services = self.root / 'services.log'
        self.npm = self.root / 'npm.log'
        self.env = dict(os.environ, PATH=f'{bin_dir}:{os.environ["PATH"]}',
                        BIRDNET_DIR=str(self.root), BIRDNET_FORCE_FRONTEND_BUILD='1',
                        TEST_SERVICE_LOG=str(self.services), TEST_NPM_LOG=str(self.npm))

    def run_build(self, failure=''):
        return subprocess.run(
            ['bash', '-c', 'source "$1"; build_frontend', 'test-installer', str(self.library)],
            env=dict(self.env, TEST_NPM_FAIL=failure), capture_output=True, text=True)

    def assert_services_restored(self):
        self.assertEqual(self.services.read_text().splitlines(), [
            'stop birdnet-web', 'stop birdnet_analysis',
            'start birdnet-web', 'start birdnet_analysis'])

    def test_dependency_failure_restores_services_and_reports_error(self):
        result = self.run_build('ci')
        self.assertEqual(result.returncode, 42)
        self.assert_services_restored()
        self.assertIn('Dependency/build failure', result.stderr)
        self.assertNotIn('run build', self.npm.read_text())
        self.assertFalse((self.root / 'frontend/build/.birdnet-build-hash').exists())

    def test_build_failure_restores_services_without_success_stamp(self):
        result = self.run_build('run')
        self.assertEqual(result.returncode, 42)
        self.assert_services_restored()
        self.assertFalse((self.root / 'frontend/build/.birdnet-build-hash').exists())

    def test_success_restores_services_once_and_records_build(self):
        result = self.run_build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_services_restored()
        self.assertTrue((self.root / 'frontend/build/.birdnet-build-hash').read_text().strip())
        self.assertIn('run build', self.npm.read_text())

    def test_unchanged_frontend_skips_services_and_dependencies(self):
        self.assertEqual(self.run_build().returncode, 0)
        self.services.unlink()
        self.npm.unlink()
        self.env['BIRDNET_FORCE_FRONTEND_BUILD'] = '0'
        result = self.run_build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(self.services.exists())
        self.assertFalse(self.npm.exists())


if __name__ == '__main__':
    unittest.main()

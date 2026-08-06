# M23 reproducible Windows build

All source inputs are pinned in `compatibility-manifest.json`. Run these commands
from an x64 Visual Studio Build Tools command prompt. The source worktree must be
the exact 2.5.6 commit with the checked-in patch applied.

```bat
call C:\BuildTools\Common7\Tools\VsDevCmd.bat -arch=x64 -host_arch=x64
set MIXXX_VCPKG_ROOT=C:\BRMediaBuilds\Mixxx-M23\buildenv\mixxx-deps-2.5-x64-windows-c15790e
cmake -S C:\BRMediaBuilds\Mixxx-M23\worktree -B C:\BRMediaBuilds\Mixxx-M23\build\x64__legacy -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo -DBUILD_TESTING=ON -DCMAKE_TOOLCHAIN_FILE=%MIXXX_VCPKG_ROOT%\scripts\buildsystems\vcpkg.cmake -DVCPKG_TARGET_TRIPLET=x64-windows
cmake --build C:\BRMediaBuilds\Mixxx-M23\build\x64__legacy
C:\BRMediaBuilds\Mixxx-M23\build\x64__legacy\mixxx-test.exe --gtest_filter=LegacyControllerMappingValidationTest.*:ControllerScriptEngineLegacyTest.*:MidiControllerTest.*:PortMidiControllerTest.*:PlayerManagerTest.*:CueControlTest.Load*:EngineBufferTest.TrackLoadResetsPitch
cmake --install C:\BRMediaBuilds\Mixxx-M23\build\x64__legacy --prefix C:\BRMediaMixxxCompatibility
```

Results:

- Configure: success, MSVC 19.44.35228 x64, Ninja, RelWithDebInfo.
- Build: success, 987 build steps, `mixxx.exe` and `mixxx-test.exe` produced.
- Focused upstream tests: 72 passed, 0 failed.
- Install: success, staged side-by-side at `C:\BRMediaMixxxCompatibility`.
- Logs: `C:\BRMediaBuilds\Mixxx-M23\logs`.

# M23 rollback

The normal Mixxx 2.5.6 installation remains at `C:\\Program Files\\Mixxx` and
the scheduled startup target must not be changed during build or validation.

Before compatibility runtime validation, with Mixxx closed, run
`windows/backup-before-validation.ps1`. It refuses to proceed while any Mixxx
process is running. It creates a read-only snapshot and then makes a separate
compatibility profile at `C:\\BRMediaMixxxCompatibilityProfile`.

1. Create a timestamped directory beneath `C:\\BRMediaBackups\\Mixxx-M23`.
2. Record the stable executable version, path and SHA-256.
3. Copy the complete `C:\\Users\\brmedia\\AppData\\Local\\Mixxx` profile,
   including `mixxx.cfg`, controller mappings and `mixxxdb.sqlite`.
4. Record file hashes and the scheduled startup-task target.
5. Copy the repository BRMedia mapping files and record their hashes.

Rollback does not copy or modify `H:\\Music`:

1. Close the compatibility Mixxx process.
2. Launch only `C:\\Program Files\\Mixxx\\mixxx.exe`.
3. The compatibility runtime uses its copied profile, so normal rollback does
   not require restoring production data. If an operator independently changed
   production profile data, restore the timestamped profile backup only while
   all Mixxx processes are closed.
4. Verify Creative ASIO selections, the `H:\\Music` library, BRMedia mapping,
   loopMIDI connection and startup-task target.
5. Leave the side-by-side compatibility directory in place until rollback is
   verified; it may then be retained for investigation without becoming the
   startup target.

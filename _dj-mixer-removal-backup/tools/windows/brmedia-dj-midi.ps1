param(
  [string]$PortName = "BRMedia DJ Remote"
)

$ErrorActionPreference = "Stop"

$source = @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public sealed class BrMediaMidiOut : IDisposable
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    private struct MIDIOUTCAPS
    {
        public ushort wMid;
        public ushort wPid;
        public uint vDriverVersion;

        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string szPname;

        public ushort wTechnology;
        public ushort wVoices;
        public ushort wNotes;
        public ushort wChannelMask;
        public uint dwSupport;
    }

    [DllImport("winmm.dll")]
    private static extern uint midiOutGetNumDevs();

    [DllImport("winmm.dll", CharSet = CharSet.Auto)]
    private static extern uint midiOutGetDevCaps(
        UIntPtr uDeviceID,
        out MIDIOUTCAPS caps,
        uint cbmoc
    );

    [DllImport("winmm.dll")]
    private static extern uint midiOutOpen(
        out IntPtr handle,
        uint deviceId,
        IntPtr callback,
        IntPtr instance,
        uint flags
    );

    [DllImport("winmm.dll")]
    private static extern uint midiOutShortMsg(
        IntPtr handle,
        uint message
    );

    [DllImport("winmm.dll")]
    private static extern uint midiOutReset(
        IntPtr handle
    );

    [DllImport("winmm.dll")]
    private static extern uint midiOutClose(
        IntPtr handle
    );

    private IntPtr _handle = IntPtr.Zero;

    public string PortName
    {
        get;
        private set;
    }

    public static string[] ListPorts()
    {
        var ports =
            new List<string>();

        uint count =
            midiOutGetNumDevs();

        for (
            uint index = 0;
            index < count;
            index++
        )
        {
            MIDIOUTCAPS caps;

            if (
                midiOutGetDevCaps(
                    (UIntPtr)index,
                    out caps,
                    (uint)Marshal.SizeOf(
                        typeof(MIDIOUTCAPS)
                    )
                ) == 0
            )
            {
                ports.Add(
                    caps.szPname ??
                    ""
                );
            }
        }

        return ports.ToArray();
    }

    public BrMediaMidiOut(
        string portName
    )
    {
        string wanted =
            (
                portName ??
                ""
            ).Trim();

        uint count =
            midiOutGetNumDevs();

        int selected =
            -1;

        string selectedName =
            "";

        for (
            uint index = 0;
            index < count;
            index++
        )
        {
            MIDIOUTCAPS caps;

            if (
                midiOutGetDevCaps(
                    (UIntPtr)index,
                    out caps,
                    (uint)Marshal.SizeOf(
                        typeof(MIDIOUTCAPS)
                    )
                ) != 0
            )
            {
                continue;
            }

            string current =
                (
                    caps.szPname ??
                    ""
                ).Trim();

            if (
                string.Equals(
                    current,
                    wanted,
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                selected =
                    (int)index;

                selectedName =
                    current;

                break;
            }

            if (
                selected < 0 &&
                current.IndexOf(
                    wanted,
                    StringComparison.OrdinalIgnoreCase
                ) >= 0
            )
            {
                selected =
                    (int)index;

                selectedName =
                    current;
            }
        }

        if (
            selected < 0
        )
        {
            throw new InvalidOperationException(
                "MIDI output port not found: " +
                wanted
            );
        }

        uint result =
            midiOutOpen(
                out _handle,
                (uint)selected,
                IntPtr.Zero,
                IntPtr.Zero,
                0
            );

        if (
            result != 0 ||
            _handle == IntPtr.Zero
        )
        {
            throw new InvalidOperationException(
                "Could not open MIDI output port: " +
                selectedName +
                " (code " +
                result +
                ")"
            );
        }

        PortName =
            selectedName;
    }

    public void Send(
        int status,
        int data1,
        int data2
    )
    {
        if (
            _handle == IntPtr.Zero
        )
        {
            throw new ObjectDisposedException(
                "BrMediaMidiOut"
            );
        }

        uint message =
            (uint)(
                (status & 0xff) |
                (
                    (
                        data1 &
                        0x7f
                    ) <<
                    8
                ) |
                (
                    (
                        data2 &
                        0x7f
                    ) <<
                    16
                )
            );

        uint result =
            midiOutShortMsg(
                _handle,
                message
            );

        if (
            result != 0
        )
        {
            throw new InvalidOperationException(
                "MIDI send failed (code " +
                result +
                ")"
            );
        }
    }

    public void Dispose()
    {
        if (
            _handle == IntPtr.Zero
        )
        {
            return;
        }

        midiOutReset(
            _handle
        );

        midiOutClose(
            _handle
        );

        _handle =
            IntPtr.Zero;
    }
}
"@

Add-Type `
  -TypeDefinition $source `
  -Language CSharp

$midi =
  $null

try {
  $midi =
    [BrMediaMidiOut]::new(
      $PortName
    )

  [Console]::WriteLine(
    "READY|$($midi.PortName)"
  )

  [Console]::Out.Flush()

  while (
    (
      $line =
        [Console]::ReadLine()
    ) -ne
    $null
  ) {
    $text =
      [string]$line

    $parts =
      $text.Split(
        '|'
      )

    $command =
      if (
        $parts.Length -gt
        0
      ) {
        ([string]$parts[0]).Trim().ToUpperInvariant()
      }
      else {
        ''
      }

    try {
      switch (
        $command
      ) {
        'PING' {
          [Console]::WriteLine(
            'PONG'
          )
        }

        'PORTS' {
          [Console]::WriteLine(
            'PORTS|' +
            (
              [string]::Join(
                '||',
                [BrMediaMidiOut]::ListPorts()
              )
            )
          )
        }

        'SEND' {
          if (
            $parts.Length -lt
            4
          ) {
            throw 'SEND expects status, data1 and data2.'
          }

          $status =
            [Convert]::ToInt32(
              $parts[1]
            )

          $data1 =
            [Convert]::ToInt32(
              $parts[2]
            )

          $data2 =
            [Convert]::ToInt32(
              $parts[3]
            )

          $midi.Send(
            $status,
            $data1,
            $data2
          )

          [Console]::WriteLine(
            "SENT|$status|$data1|$data2"
          )
        }

        'QUIT' {
          [Console]::WriteLine(
            'BYE'
          )

          [Console]::Out.Flush()

          break
        }

        default {
          [Console]::WriteLine(
            "ERROR|Unknown command: $text"
          )
        }
      }
    }
    catch {
      [Console]::WriteLine(
        "ERROR|$($_.Exception.Message)"
      )
    }

    [Console]::Out.Flush()

    if (
      $command -eq
      'QUIT'
    ) {
      break
    }
  }
}
catch {
  [Console]::WriteLine(
    "FATAL|$($_.Exception.Message)"
  )

  [Console]::Out.Flush()

  exit 1
}
finally {
  if (
    $null -ne
    $midi
  ) {
    $midi.Dispose()
  }
}

// BRMedia M26: bounded Windows render-endpoint loopback capture helper.
// Emits signed 16-bit, 48 kHz, stereo little-endian PCM to stdout.
// An explicit render endpoint ID is mandatory; there is no default-device or
// capture/microphone fallback.
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

internal static class M26WasapiLoopback
{
    private const int ExitUsage = 64;
    private const int ExitEndpoint = 65;
    private const int ExitCapture = 66;
    private const uint DeviceStateActive = 0x1;
    private const int EDataFlowRender = 0;
    private const uint ClsctxAll = 23;
    private const int AudclntSharemodeShared = 0;
    private const uint StreamLoopback = 0x00020000;
    private const uint StreamAutoConvertPcm = 0x80000000;
    private const uint StreamSrcDefaultQuality = 0x08000000;
    private const uint BufferSilent = 0x2;
    private const int AudioClientStarted = 1;

    [STAThread]
    private static int Main(string[] args)
    {
        try
        {
            if (args.Length == 1 && args[0] == "--self-test") return SelfTest();
            if (args.Length == 2 && args[0] == "--probe-endpoint") return Probe(args[1]);
            if (args.Length >= 2 && args[0] == "--capture-endpoint")
            {
                int maxSeconds = 0;
                if (args.Length == 4 && args[2] == "--max-seconds" &&
                    (!Int32.TryParse(args[3], out maxSeconds) || maxSeconds < 1 || maxSeconds > 86400))
                    return Fail(ExitUsage, "invalid_max_seconds", "--max-seconds must be 1..86400");
                if (args.Length != 2 && args.Length != 4)
                    return Fail(ExitUsage, "invalid_arguments", Usage());
                return Capture(args[1], maxSeconds);
            }
            return Fail(ExitUsage, "invalid_arguments", Usage());
        }
        catch (COMException error)
        {
            return Fail(ExitCapture, "com_error", error.Message + " (0x" + error.ErrorCode.ToString("X8") + ")");
        }
        catch (Exception error)
        {
            return Fail(ExitCapture, "capture_error", error.Message);
        }
    }

    private static string Usage()
    {
        return "Use --probe-endpoint <render-id>, --capture-endpoint <render-id> [--max-seconds N], or --self-test";
    }

    private static int SelfTest()
    {
        if (BytesPerSecond(48000, 2, 16) != 192000)
            return Fail(ExitCapture, "self_test_failed", "PCM byte-rate invariant failed");
        byte[] silence = new byte[16];
        foreach (byte value in silence) if (value != 0)
            return Fail(ExitCapture, "self_test_failed", "silence invariant failed");
        Status("self_test", "ok", "pcm_s16le", "48000", "2");
        return 0;
    }

    private static int Probe(string endpointId)
    {
        Endpoint endpoint;
        int result = OpenExplicitRenderEndpoint(endpointId, out endpoint);
        if (result != 0) return result;
        try
        {
            Status("endpoint_probe", "ok", endpoint.Id, endpoint.State.ToString(), "render");
            return 0;
        }
        finally { endpoint.Dispose(); }
    }

    private static int Capture(string endpointId, int maxSeconds)
    {
        Endpoint endpoint;
        int result = OpenExplicitRenderEndpoint(endpointId, out endpoint);
        if (result != 0) return result;
        IAudioClient audioClient = null;
        IAudioCaptureClient captureClient = null;
        try
        {
            Guid audioClientId = typeof(IAudioClient).GUID;
            object activated;
            Marshal.ThrowExceptionForHR(endpoint.Device.Activate(ref audioClientId, ClsctxAll, IntPtr.Zero, out activated));
            audioClient = (IAudioClient)activated;

            WaveFormatEx format = new WaveFormatEx();
            format.wFormatTag = 1;
            format.nChannels = 2;
            format.nSamplesPerSec = 48000;
            format.wBitsPerSample = 16;
            format.nBlockAlign = 4;
            format.nAvgBytesPerSec = (uint)BytesPerSecond(48000, 2, 16);
            format.cbSize = 0;
            long bufferDuration100ns = 1000000; // 100 ms engine buffer, not retained by this process.
            uint flags = StreamLoopback | StreamAutoConvertPcm | StreamSrcDefaultQuality;
            Marshal.ThrowExceptionForHR(audioClient.Initialize(AudclntSharemodeShared, flags,
                bufferDuration100ns, 0, ref format, IntPtr.Zero));

            Guid captureId = typeof(IAudioCaptureClient).GUID;
            object service;
            Marshal.ThrowExceptionForHR(audioClient.GetService(ref captureId, out service));
            captureClient = (IAudioCaptureClient)service;

            Stream output = Console.OpenStandardOutput();
            byte[] zeroes = new byte[65536];
            long deadline = maxSeconds > 0 ? DateTime.UtcNow.AddSeconds(maxSeconds).Ticks : Int64.MaxValue;
            Status("capture", "starting", endpoint.Id, "pcm_s16le", "48000", "2");
            Marshal.ThrowExceptionForHR(audioClient.Start());
            int state = AudioClientStarted;
            try
            {
                while (DateTime.UtcNow.Ticks < deadline)
                {
                    uint packetFrames;
                    Marshal.ThrowExceptionForHR(captureClient.GetNextPacketSize(out packetFrames));
                    if (packetFrames == 0) { Thread.Sleep(3); continue; }
                    while (packetFrames > 0)
                    {
                        IntPtr data;
                        uint frames;
                        uint packetFlags;
                        ulong devicePosition;
                        ulong qpcPosition;
                        Marshal.ThrowExceptionForHR(captureClient.GetBuffer(out data, out frames,
                            out packetFlags, out devicePosition, out qpcPosition));
                        try
                        {
                            int byteCount = checked((int)frames * format.nBlockAlign);
                            if ((packetFlags & BufferSilent) != 0)
                            {
                                int remaining = byteCount;
                                while (remaining > 0)
                                {
                                    int count = Math.Min(remaining, zeroes.Length);
                                    output.Write(zeroes, 0, count);
                                    remaining -= count;
                                }
                            }
                            else
                            {
                                byte[] bytes = new byte[byteCount];
                                Marshal.Copy(data, bytes, 0, byteCount);
                                output.Write(bytes, 0, bytes.Length);
                            }
                        }
                        finally { captureClient.ReleaseBuffer(frames); }
                        Marshal.ThrowExceptionForHR(captureClient.GetNextPacketSize(out packetFrames));
                    }
                    output.Flush();
                }
            }
            finally
            {
                if (state == AudioClientStarted) audioClient.Stop();
            }
            Status("capture", "stopped", endpoint.Id);
            return 0;
        }
        finally
        {
            ReleaseCom(captureClient);
            ReleaseCom(audioClient);
            endpoint.Dispose();
        }
    }

    private static int OpenExplicitRenderEndpoint(string endpointId, out Endpoint endpoint)
    {
        endpoint = null;
        if (String.IsNullOrWhiteSpace(endpointId) || endpointId.Length > 512)
            return Fail(ExitUsage, "invalid_endpoint_id", "An explicit endpoint ID is required");
        IMMDeviceEnumerator enumerator = null;
        IMMDevice device = null;
        try
        {
            enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
            int hr = enumerator.GetDevice(endpointId, out device);
            if (hr < 0 || device == null)
                return Fail(ExitEndpoint, "endpoint_not_found", "The explicit endpoint was not found");
            int state;
            Marshal.ThrowExceptionForHR(device.GetState(out state));
            if (((uint)state & DeviceStateActive) == 0)
                return Fail(ExitEndpoint, "endpoint_inactive", "The explicit endpoint is not active");
            IMMEndpoint flow = device as IMMEndpoint;
            int dataFlow;
            if (flow == null || flow.GetDataFlow(out dataFlow) < 0 || dataFlow != EDataFlowRender)
                return Fail(ExitEndpoint, "endpoint_not_render", "Microphone/capture endpoints are forbidden");
            endpoint = new Endpoint(endpointId, (uint)state, device);
            device = null;
            return 0;
        }
        finally
        {
            ReleaseCom(device);
            ReleaseCom(enumerator);
        }
    }

    private static int BytesPerSecond(int rate, int channels, int bits)
    {
        return checked(rate * channels * bits / 8);
    }

    private static int Fail(int code, string kind, string detail)
    {
        Status("error", kind, detail);
        return code;
    }

    private static void Status(params string[] values)
    {
        StringBuilder text = new StringBuilder("M26_WASAPI");
        foreach (string value in values)
        {
            text.Append('\t');
            text.Append((value ?? "").Replace("\r", " ").Replace("\n", " ").Replace("\t", " "));
        }
        Console.Error.WriteLine(text.ToString());
    }

    private static void ReleaseCom(object value)
    {
        if (value != null && Marshal.IsComObject(value)) Marshal.FinalReleaseComObject(value);
    }

    private sealed class Endpoint : IDisposable
    {
        internal readonly string Id;
        internal readonly uint State;
        internal readonly IMMDevice Device;
        internal Endpoint(string id, uint state, IMMDevice device) { Id = id; State = state; Device = device; }
        public void Dispose() { ReleaseCom(Device); }
    }

    [StructLayout(LayoutKind.Sequential, Pack = 2)]
    private struct WaveFormatEx
    {
        public ushort wFormatTag, nChannels;
        public uint nSamplesPerSec, nAvgBytesPerSec;
        public ushort nBlockAlign, wBitsPerSample, cbSize;
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    private class MMDeviceEnumeratorComObject { }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
    private interface IMMDeviceEnumerator
    {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, uint stateMask, out IntPtr devices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
        [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice endpoint);
        [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr client);
        [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr client);
    }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("D666063F-1587-4E43-81F1-B948E807363F")]
    private interface IMMDevice
    {
        [PreserveSig] int Activate(ref Guid iid, uint clsctx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object instance);
        [PreserveSig] int OpenPropertyStore(uint access, out IntPtr properties);
        [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
        [PreserveSig] int GetState(out int state);
    }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("1BE09788-6894-4089-8586-9A2A6C265AC5")]
    private interface IMMEndpoint { [PreserveSig] int GetDataFlow(out int dataFlow); }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("1CB9AD4C-DBFA-4C32-B178-C2F568A703B2")]
    private interface IAudioClient
    {
        [PreserveSig] int Initialize(int shareMode, uint streamFlags, long bufferDuration, long periodicity, ref WaveFormatEx format, IntPtr sessionGuid);
        [PreserveSig] int GetBufferSize(out uint bufferFrames);
        [PreserveSig] int GetStreamLatency(out long latency);
        [PreserveSig] int GetCurrentPadding(out uint paddingFrames);
        [PreserveSig] int IsFormatSupported(int shareMode, ref WaveFormatEx format, out IntPtr closestMatch);
        [PreserveSig] int GetMixFormat(out IntPtr format);
        [PreserveSig] int GetDevicePeriod(out long defaultPeriod, out long minimumPeriod);
        [PreserveSig] int Start();
        [PreserveSig] int Stop();
        [PreserveSig] int Reset();
        [PreserveSig] int SetEventHandle(IntPtr eventHandle);
        [PreserveSig] int GetService(ref Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
    }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("C8ADBD64-E71E-48A0-A4DE-185C395CD317")]
    private interface IAudioCaptureClient
    {
        [PreserveSig] int GetBuffer(out IntPtr data, out uint frames, out uint flags, out ulong devicePosition, out ulong qpcPosition);
        [PreserveSig] int ReleaseBuffer(uint frames);
        [PreserveSig] int GetNextPacketSize(out uint frames);
    }
}

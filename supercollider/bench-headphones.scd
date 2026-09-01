(
// ============================================================
// BENCH TEST ONLY — headphones / built-in output (stereo)
// ============================================================
//
// NOT for show day. Use anatomija_pregona-2026-09-01.scd with the
// 8ch USB interface in the gallery.
//
// Verifies the same OSC contract as production:
//   /shower 1–4  →  vox-01 … vox-04
//
// All audio is mixed to stereo (macOS default output). Set your
// Sennheiser as System Settings → Sound → Output before evaluating.
//
// ============================================================


// ============================================================
// SETUP (bench)
// ============================================================

ServerOptions.outDevices;

~device = nil;  // system default — or paste name from outDevices list
~numOutputs = 2;
~numInputs = 0;
~sampleRate = 44100;


// ============================================================
// FILES (same as show)
// ============================================================

~audioRoot = "/Users/moderna/izbrisani/content/audio";

~loopFrontPath = ~audioRoot +/+ "ambient/loop-front.wav";
~loopBackPath = ~audioRoot +/+ "ambient/loop-back.wav";

~showerPaths = [
	~audioRoot +/+ "vox-01.wav",
	~audioRoot +/+ "vox-02.wav",
	~audioRoot +/+ "vox-03.wav",
	~audioRoot +/+ "vox-04.wav"
];


// ============================================================
// SERVER CONFIGURATION
// ============================================================

if(~device.notNil) { s.options.device = ~device };
s.options.numOutputBusChannels = ~numOutputs;
s.options.numInputBusChannels = 0;
s.options.sampleRate = ~sampleRate;


// ============================================================
// BOOT
// ============================================================

s.waitForBoot({

    "========================================".postln;
    "BENCH TEST — HEADPHONES (NOT SHOW)".postln;
    "========================================".postln;

    postln("Device: " ++ if(~device.isNil) { "system default" } { ~device });
    ("Outputs: " ++ ~numOutputs).postln;
    ("Sample rate: " ++ s.sampleRate).postln;


    ~loopFront = Buffer.read(s, ~loopFrontPath);
    ~loopBack = Buffer.read(s, ~loopBackPath);

    ~showers = ~showerPaths.collect { |path|
        Buffer.read(s, path)
    };

    s.sync;


    SynthDef(\benchLoop, {
        |front, amp = 0.35|

        var frontSig;

        frontSig = PlayBuf.ar(
            2,
            front,
            BufRateScale.kr(front),
            loop: 1
        );

        Out.ar(0, frontSig * amp);

    }).add;


    SynthDef(\benchVox, {
        |buf, amp = 1|

        var sig;

        sig = PlayBuf.ar(
            1,
            buf,
            BufRateScale.kr(buf),
            doneAction: 2
        );

        Out.ar(0, Pan2.ar(sig, 0) * amp);

    }).add;


    s.sync;


    ~loopSynth = Synth(
        \benchLoop,
        [
            \front, ~loopFront,
            \amp,   0.35
        ]
    );

    ~playing = Array.fill(4, nil);


    OSCdef(\benchShowerTrigger, { |msg|

        var station;
        var index;

        station = msg[1].asInteger;

        if(station >= 1 && { station <= 4 }) {

            index = station - 1;

            if(~playing[index].notNil) {
                ~playing[index].free;
                ~playing[index] = nil;
            };

            ~playing[index] = Synth(
                \benchVox,
                [
                    \buf, ~showers[index],
                    \amp, 1
                ]
            );

            (
                "BENCH station " ++ station ++
                " → vox-0" ++ station ++ " (stereo mix)"
            ).postln;

        } {
            ("Invalid station number: " ++ station).postln;
        };

    }, '/shower');


    "".postln;
    "LOOP: running (front bed only, quiet)".postln;
    "SHOWERS: listening on /shower 1–4".postln;
    "Then: npm start + npm run control".postln;
    "========================================".postln;

});
)

(
~testShower = { |station|
    NetAddr("127.0.0.1", NetAddr.langPort)
        .sendMsg("/shower", station);
};
)

// ~testShower.value(1);

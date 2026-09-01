(
// ============================================================
// EXHIBITION AUDIO ENGINE — SHOW (production)
// ============================================================
//
// 8ch USB interface. Do NOT use for laptop/headphone bench tests —
// open bench-headphones.scd instead.
//
// OUTPUT MAP
//
// 0  FL  — background
// 1  FR  — background
// 2  RL  — background
// 3  RR  — background
// 4  FC  — sound shower 1
// 5  BC  — sound shower 2
// 6  SR  — sound shower 3
// 7  SL  — sound shower 4
//
// ============================================================


// ============================================================
// SETUP
// ============================================================

ServerOptions.outDevices;
~device = "USB Sound Device";

~numOutputs = 8;
~numInputs = 0;

~sampleRate = 44100;


// ============================================================
// FILES
// ============================================================

// Paths: edit ~audioRoot for Mac Mini install (repo clone path).

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

s.options.device = ~device;
s.options.numOutputBusChannels = ~numOutputs;
s.options.numInputBusChannels = 0;
s.options.sampleRate = ~sampleRate;


// ============================================================
// BOOT
// ============================================================

s.waitForBoot({

    "========================================".postln;
    "EXHIBITION AUDIO (SHOW)".postln;
    "========================================".postln;

    ("Device: " ++ ~device).postln;
    ("Outputs: " ++ ~numOutputs).postln;
    ("Sample rate: " ++ s.sampleRate).postln;


    // ========================================================
    // LOAD LOOP
    // ========================================================

    ~loopFront =
        Buffer.read(s, ~loopFrontPath);

    ~loopBack =
        Buffer.read(s, ~loopBackPath);


    // ========================================================
    // LOAD MONOLOGUES
    // ========================================================

    ~showers = ~showerPaths.collect { |path|
        Buffer.read(s, path)
    };


    s.sync;


    // ========================================================
    // LOOP SYNTH
    // ========================================================

    SynthDef(\loop, {
        |front, back, amp = 1|

        var frontSig;
        var backSig;

        frontSig = PlayBuf.ar(
            2,
            front,
            BufRateScale.kr(front),
            loop: 1
        );

        backSig = PlayBuf.ar(
            2,
            back,
            BufRateScale.kr(back),
            loop: 1
        );

        Out.ar(
            0,
            [
                frontSig[0],    // FL
                frontSig[1],    // FR
                backSig[0],     // RL
                backSig[1]      // RR
            ] * amp
        );

    }).add;


    // ========================================================
    // MONOLOGUE SYNTH
    // ========================================================

    SynthDef(\vox, {
        |buf, out, amp = 1|

        var sig;

        sig = PlayBuf.ar(
            1,
            buf,
            BufRateScale.kr(buf),
            doneAction: 2
        );

        Out.ar(
            out,
            sig * amp
        );

    }).add;


    s.sync;


    // ========================================================
    // START LOOP
    // ========================================================

    ~loopSynth = Synth(
        \loop,
        [
            \front, ~loopFront,
            \back,  ~loopBack,
            \amp,   1
        ]
    );


    // ========================================================
    // MONOLOGUE STATE
    // ========================================================

    ~playing = Array.fill(4, nil);


    // ========================================================
    // OSC TRIGGERS
    // ========================================================

    OSCdef(\showerTrigger, { |msg|

        var station;
        var index;
        var output;

        station = msg[1].asInteger;

        if(station >= 1 && { station <= 4 }) {

            index = station - 1;
            output = index + 4;

            if(~playing[index].notNil) {
                ~playing[index].free;
                ~playing[index] = nil;
            };

            ~playing[index] = Synth(
                \vox,
                [
                    \buf, ~showers[index],
                    \out, output,
                    \amp, 1
                ]
            );

            (
                "Station " ++ station ++
                " triggered → output " ++ output
            ).postln;

        } {
            (
                "Invalid station number: " ++ station
            ).postln;
        };

    }, '/shower');


    // ========================================================
    // OUTPUT TEST (8ch rack)
    // ========================================================

    SynthDef(\outputTest, {
        |out = 0, freq = 440, amp = 0.1|

        var sig;

        sig = SinOsc.ar(freq);

        sig = sig * EnvGen.kr(
            Env.perc(0.01, 0.7),
            doneAction: 2
        );

        Out.ar(out, sig * amp);

    }).add;

    s.sync;


    ~outputNames = [
        "FL",
        "FR",
        "RL",
        "RR",
        "SHOWER 1",
        "SHOWER 2",
        "SHOWER 3",
        "SHOWER 4"
    ];


    ~testOutputs = {

        Routine({

            8.do { |i|

                (
                    "TEST: " ++
                    ~outputNames[i] ++
                    " → output " ++ i
                ).postln;

                Synth(
                    \outputTest,
                    [
                        \out, i,
                        \amp, 0.1
                    ]
                );

                1.wait;
            };

            "========================================".postln;
            "OUTPUT TEST COMPLETE".postln;

        }).play;

    };


    // ========================================================
    // READY
    // ========================================================

    "".postln;
    "LOOP: running".postln;
    "SHOWERS: listening on /shower 1–4".postln;
    "".postln;
    "Use ~testOutputs.value to test physical outputs.".postln;
    "========================================".postln;

});
)

(
~testShower = { |station|
    NetAddr("127.0.0.1", NetAddr.langPort)
        .sendMsg("/shower", station);
};
)

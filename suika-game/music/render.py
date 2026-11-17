"""Render the original Pocket Parade loop with Python, NumPy, SciPy and FFmpeg."""

from pathlib import Path
import subprocess

import numpy as np
from scipy.signal import butter, sosfilt


SR = 48000
BEAT = 60 / 128
FRAMES = round(16 * 4 * BEAT * SR)
TAU = 2 * np.pi
mix = np.zeros((FRAMES, 2))
room = np.zeros_like(mix)
rng = np.random.default_rng(211)


def add(frame, signal, pan, send=0):
    """Wrap releases over the loop boundary, including the final drum fill."""
    start = round(frame * BEAT * SR) % FRAMES
    angle = (pan + 1) * np.pi / 4
    stereo = signal[:, None] * [np.cos(angle), np.sin(angle)]
    count = min(len(signal), FRAMES - start)
    mix[start:start + count] += stereo[:count]
    room[start:start + count] += stereo[:count] * send
    if count < len(signal):
        mix[:len(signal) - count] += stereo[count:]
        room[:len(signal) - count] += stereo[count:] * send


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def tone(at, pitch, duration, voice, level=1, pan=0):
    gate = duration * BEAT
    release = {"lead": .065, "tine": .100, "bass": .041, "bell": .18}[voice]
    t = np.arange(round((gate + release * 5) * SR)) / SR
    freq = hz(pitch)
    envelope = np.exp(-np.maximum(0, t - gate) / release)
    phase = TAU * freq * t
    if voice == "lead":
        # A lightly rounded pulse with a brief mallet transient.
        vib = .0034 * np.sin(TAU * 5.2 * t) * np.clip((t - .10) / .17, 0, 1)
        phase = TAU * freq * np.cumsum(1 + vib) / SR
        wave = np.sin(phase) + .34 * np.sin(2 * phase + .18) + .17 * np.sin(3 * phase)
        wave += .09 * np.sin(5 * phase) * np.exp(-4*t)
        wave += .25 * np.sin(phase + 1.5 * np.exp(-30*t) * np.sin(phase * 2))
        envelope *= -np.expm1(-t/.005) * (.75 + .25 * np.exp(-8*t))
        volume, send = .19, .22
    elif voice == "tine":
        # Short electric-piano stabs, voiced below the principal melody.
        mod = (1.2 * np.exp(-10*t) + .18) * np.sin(phase * 2.005)
        wave = np.sin(phase + mod) + .22 * np.sin(phase * 2.001 + mod)
        envelope *= -np.expm1(-t/.003) * (.68*np.exp(-4*t) + .32*np.exp(-.8*t))
        volume, send = .079, .12
    elif voice == "bell":
        wave = np.sin(phase + .72*np.exp(-15*t)*np.sin(phase*2))
        wave += .36 * np.sin(phase*2.002) * np.exp(-6*t)
        envelope *= -np.expm1(-t/.002) * np.exp(-4*t)
        volume, send = .12, .26
    else:
        bend = TAU * freq * .001 * (1 - np.exp(-65*t))
        p = phase + bend
        wave = np.sin(p) + .40*np.sin(2*p)*np.exp(-4*t) + .20*np.sin(3*p)*np.exp(-6*t)
        wave += .09*np.sin(5*p)*np.exp(-20*t)
        envelope *= -np.expm1(-t/.004) * (.63 + .37*np.exp(-7*t))
        volume, send = .30, .014
    add(at, wave * envelope * level * volume, pan, send)


def drum(at, kind, level, pan=0):
    length = {"kick": .32, "snare": .18, "hat": .075, "open": .19, "rim": .085}[kind]
    t = np.arange(round(length * SR)) / SR
    noise = rng.normal(0, 1, len(t))
    if kind == "kick":
        phase = TAU * (54*t + 85*.023*(1-np.exp(-t/.023)))
        wave = .69*np.sin(phase)*np.exp(-t/.084) + .075*noise*np.exp(-t/.0035)
        send = .013
    elif kind == "snare":
        snap = sosfilt(butter(2, [1300, 8200], btype="bandpass", fs=SR, output="sos"), noise)
        hand = sum(np.exp(-np.maximum(0, t-lag)/.024)*(t >= lag)*v
                   for lag, v in [(0, .54), (.011, .28), (.021, .24)])
        wave = .48*snap*hand + .22*np.sin(TAU*(185*t+.5*(1-np.exp(-40*t))))*np.exp(-t/.05)
        send = .12
    elif kind == "rim":
        wave = (.11*np.sin(TAU*920*t) + .09*np.sin(TAU*1420*t))*np.exp(-t/.012)
        send = .16
    else:
        metal = sosfilt(butter(2, [5700, 13200], btype="bandpass", fs=SR, output="sos"), noise)
        decay = .044 if kind == "open" else .015
        wave = .26*metal*np.exp(-t/decay)
        send = .08
    wave *= -np.expm1(-t/.0012) * np.minimum(1, (length-t)/.008)
    add(at, wave*level, pan, send)


# A four-note call returns over changing chords. The middle four bars let
# the lower register answer before the main hook comes back.
def hook(notes, ending):
    return [(0, notes[0], .30), (.5, notes[1], .15), (.75, notes[2], .44),
            (1.5, notes[3], .87), *ending]


call = hook([71, 71, 74, 79], [(2.75, 76, .28), (3.25, 74, .56)])
answer = hook([69, 69, 74, 78], [(2.75, 74, .25), (3.25, 71, .55)])
lift = hook([71, 71, 74, 79], [(2.75, 81, .24), (3.25, 79, .48)])
release = [(0, 76, .60), (.75, 74, .24), (1.25, 72, .45), (2, 69, .65), (3.5, 74, .28)]
lead = [
    call, answer, lift, release,
    call, answer, hook([72, 72, 76, 81], [(2.75, 79, .32), (3.25, 76, .46)]),
    [(0, 74, .89), (1.5, 71, .27), (2, 69, .69), (3.25, 67, .29)],
    [(0, 67, .63), (.75, 69, .30), (1.5, 72, .68), (2.5, 71, .24), (3, 69, .64)],
    [(.25, 67, .25), (.75, 71, .32), (1.5, 74, 1.10), (3, 71, .48)],
    [(0, 69, .65), (.75, 71, .31), (1.5, 76, .75), (2.5, 74, .3), (3, 72, .63)],
    [(0, 69, .62), (.75, 72, .28), (1.5, 74, .72), (2.75, 78, .28), (3.25, 74, .43)],
    call, lift,
    hook([72, 72, 76, 79], [(2.75, 76, .31), (3.25, 74, .45)]),
    [(0, 72, .62), (.75, 71, .27), (1.25, 69, .45), (2, 74, .65)]
]

# Chord symbols by section: G6/9 D/F# Em7 C6-D9 | G6/9 D/F# Cmaj7 D6 |
# Cmaj9 G/B Am9 D9 | G6/9 Em7 Cmaj9 Am7-D9.
chords = [
    (43,(55,59,62,69)), (42,(57,62,66,71)), (40,(55,59,62,66)), (36,(55,60,64,69)),
    (43,(55,59,62,69)), (42,(57,62,66,69)), (36,(55,59,64,67)), (38,(54,57,62,71)),
    (36,(55,59,62,64)), (35,(55,59,62,67)), (33,(55,59,60,64)), (38,(54,57,60,64)),
    (43,(55,59,62,69)), (40,(55,59,62,66)), (36,(55,59,62,64)), (33,(55,57,60,64))
]


def arrange():
    for bar, (root, chord) in enumerate(chords):
        base = bar * 4
        bridge = 8 <= bar < 12
        for i, (beat, pitch, gate) in enumerate(lead[bar]):
            strength = (.86 if gate < .32 else 1.0) * (.91 if bridge else 1.0)
            tone(base + beat, pitch, gate, "lead", strength, -.04)
            if bar in (4, 6, 12, 14) and i == 3:
                tone(base + beat + .018, pitch + 12, gate * .67, "bell", .30, .27)
        stabs = [(0, .92, .90), (1.5, .28, .69), (2.75, .48, .85)] if bridge else [
            (.5, .21, .98), (1.5, .34, .84), (2.5, .18, .88), (3.5, .30, .77)]
        for beat, gate, strength in stabs:
            notes = (54,57,60,64) if bar in (3,15) and beat >= 2 else chord
            for i, pitch in enumerate(notes):
                tone(base + beat + .007*i, pitch, gate, "tine", strength*(1-i*.055), -.44+.13*i)
        # Let the bell answer in the gaps rather than doubling every beat.
        if bar in (1, 5, 9, 13):
            tone(base + 2.45, chord[-2]+12, .22, "bell", .63, .46)
            tone(base + 3.77, chord[0]+12, .17, "bell", .55, .35)
        if bar in (3, 7, 11, 15):
            for i, note in enumerate(([66,69,74] if bar != 7 else [67,69,71])):
                tone(base + 3.25 + i*.25, note, .17, "bell", .66 + .07*i, .35)
        target = chords[(bar+1) % len(chords)][0]
        bass = [(0, root, .78, 1), (1.5, root+12, .28, .72), (2, root+7, .57, .86),
                (2.75, root+12, .22, .60), (3.5, target-2, .38, .82)]
        if bridge:
            bass = [(0, root, 1.25, 1), (1.75,root+7,.22,.65), (2.5,root+12,.62,.86),
                    (3.5,target-1,.38,.73)]
        if bar in (3,15):
            bass = [(0,root,.8,1), (1.5,root+7,.28,.70), (2,38,.72,.98), (3,45,.38,.74),
                    (3.65,42,.23,.8)]
        for beat, pitch, gate, strength in bass:
            tone(base+beat, pitch, gate, "bass", strength)
        for beat in ([0, 2.5] if bridge else ([0, 1.75, 2.5] if bar%2 else [0, 2, 2.75])):
            drum(base+beat, "kick", .84 if beat%1 else 1)
        for beat in (1.014, 3.016):
            drum(base+beat, "snare", .82 if bridge else .98, .07)
        for i in range(8):
            if bridge and i in (2,6):
                continue
            opened = i == 7 and bar % 4 in (0,2)
            drum(base+i*.5 + (.018 if i%2 else 0), "open" if opened else "hat",
                 (.52 if i%2 else .68) * rng.uniform(.88,1.05), -.28 if i%2 else .28)
        if bar%4 == 3:
            for beat, strength in [(3.47,.46),(3.75,.62)]:
                drum(base+beat,"rim",strength,.28)


def render():
    arrange()
    # Small stereo room and two dark chip echoes, circular for a clean seam.
    dark_room = sosfilt(butter(2, 4300, fs=SR, output="sos"), room, axis=0)
    for delay, volume in [(.037,.28),(.078,.24),(BEAT*.5,.41),(BEAT*.75,.32),(BEAT*1.5,.14)]:
        mix[:] += np.roll(dark_room[:, ::-1], round(delay*SR), axis=0)*volume
    mix[:] = np.tanh(1.50*mix) / 1.30
    mix[:] *= .84/np.max(np.abs(mix))
    out = Path(__file__).resolve().parents[1] / "assets" / "pocket-parade.mp3"
    subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","2","-i","pipe:0",
                    "-c:a","libmp3lame","-b:a","192k","-write_xing","1",
                    "-metadata","title=Pocket Parade","-metadata","album=Sukima Arcade",str(out)],
                   input=mix.astype("<f4").tobytes(), check=True)


if __name__ == "__main__":
    render()

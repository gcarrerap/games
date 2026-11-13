"""Audio original reproducible, sin servicios externos. Ejecutar con Python 3 y ffmpeg.
Los MP3 resultantes se versionan: no hay síntesis ni compilación al jugar.
"""
import math, pathlib, struct, subprocess, tempfile, wave
ROOT = pathlib.Path(__file__).resolve().parents[1] / 'audio'
RATE = 22050

def export(name, duration, notes):
    data = [0.] * int(duration * RATE)
    for start, dur, frequency, gain, kind in notes:
        begin, length = int(start*RATE), int(dur*RATE)
        for j in range(length):
            at = begin+j
            if at >= len(data): break
            t = j/RATE
            env = min(1, t/.008) * math.exp(-t/(dur*.28)) * min(1, (dur-t)/.04)
            phase = 2*math.pi*frequency*t
            if kind == 'boing': phase += 5*math.sin(2*math.pi*7*t)*math.exp(-t*10)
            tone = math.sin(phase)+.24*math.sin(phase*2.01)+.08*math.sin(phase*3.99)
            data[at] += tone*env*gain
    # Margen de pico y sin clipping; al final queda silencio para evitar cortes.
    peak = max(max(map(abs,data)), .001)
    scale = min(1, .7/peak)
    with tempfile.TemporaryDirectory() as d:
        src=pathlib.Path(d)/'audio.wav'
        with wave.open(str(src),'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE)
            w.writeframes(b''.join(struct.pack('<h',int(x*scale*32767)) for x in data))
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-codec:a','libmp3lame','-b:a','64k',str(ROOT/f'{name}.mp3')],check=True)

for i,f in enumerate([523.25,659.25,392,440,783.99,329.63]):
    export(f'pick{i}',.52,[(0,.33,f,.42,'boing'),(.14,.3,f*1.5,.16,'bell')])
export('erase',.3,[(0,.2,280,.25,'boing')])
export('clue',.8,[(0,.3,523,.28,'bell'),(.16,.35,659,.3,'bell'),(.32,.4,784,.3,'bell')])
export('win',2.4,[(i*.16,.65,f,.32,'bell') for i,f in enumerate([523,659,784,1046,784,1046])]+[(1.2,.95,f,.14,'bell') for f in [523,659,784,1046]])
export('retry',1.3,[(0,.5,523,.28,'bell'),(.25,.5,440,.23,'bell'),(.55,.6,659,.25,'bell')])
# 16 compases en do mayor, marimba suave y bajo pizzicato. Melodía compuesta para el juego.
melody = [[76,79,81,79,76,72,74,0],[74,77,79,77,74,71,72,0],
          [72,76,79,81,79,76,74,0],[74,71,67,71,74,76,72,0]]
notes=[]
beat=.34
for bar in range(16):
    phrase=melody[bar%4]
    for step,midi in enumerate(phrase):
        if midi: notes.append(((bar*8+step)*beat,.42,440*2**((midi-69)/12),.13,'bell'))
    bass=[48,53,57,55][bar%4]
    for step in [0,4]: notes.append(((bar*8+step)*beat,.8,440*2**((bass-69)/12),.15,'bell'))
export('club-theme',16*8*beat,notes)
print('11 clips originales generados')

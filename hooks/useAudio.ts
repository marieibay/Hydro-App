
import { useState, useRef, useCallback } from 'react';
import React from 'react';

export const useAudio = () => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const [isAudioUnlocked, setAudioUnlocked] = useState(false);

    const ensureAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
            }
        }
        return audioCtxRef.current;
    }, []);

    const unlockAudio = useCallback(() => {
        if (isAudioUnlocked) return;
        const ac = ensureAudioContext();
        if (ac && ac.state === 'suspended') {
            ac.resume().then(() => {
                setAudioUnlocked(true);
            }).catch(e => console.error("Failed to resume audio context", e));
        } else if (ac && ac.state === 'running') {
            setAudioUnlocked(true);
        }
    }, [ensureAudioContext, isAudioUnlocked]);

    const playSound = useCallback((...soundFns: ((ac: AudioContext, time: number) => void)[]) => {
        const ac = ensureAudioContext();
        if (!ac || ac.state !== 'running') return;
        soundFns.forEach(fn => fn(ac, ac.currentTime));
    }, [ensureAudioContext]);

    const beep = (freq: number, time: number, type: OscillatorType) => (ac: AudioContext, now: number) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + time);
        o.connect(g).connect(ac.destination);
        o.start(now);
        o.stop(now + time + 0.02);
    };

    const playGulp = useCallback(() => playSound(beep(800, 0.06, 'square'), (ac, now) => setTimeout(() => playSound(beep(420, 0.08, 'sawtooth')), 40)), [playSound]);
    
    const playToast = useCallback(() => {
      playSound(beep(660, 0.08, 'sine'));
      setTimeout(() => playSound(beep(880, 0.09, 'sine')), 90);
      setTimeout(() => playSound(beep(550, 0.12, 'triangle')), 200);
    }, [playSound]);
    
    const playEat = useCallback(() => {
       const ac = ensureAudioContext();
       if (!ac || ac.state !== 'running') return;
       const now = ac.currentTime;
       
       // Crunchy noise part
       const bufferSize = ac.sampleRate * 0.1;
       const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
       const output = buffer.getChannelData(0);
       for (let i = 0; i < bufferSize; i++) {
           output[i] = (Math.random() * 2 - 1) * 0.4;
       }
       const noise = ac.createBufferSource();
       noise.buffer = buffer;
       
       const bandpass = ac.createBiquadFilter();
       bandpass.type = 'bandpass';
       bandpass.frequency.setValueAtTime(1500, now);
       bandpass.Q.value = 1.5;

       const noiseGain = ac.createGain();
       noiseGain.gain.setValueAtTime(0, now);
       noiseGain.gain.linearRampToValueAtTime(0.7, now + 0.01);
       noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

       noise.connect(bandpass).connect(noiseGain).connect(ac.destination);
       noise.start(now);
       noise.stop(now + 0.1);
       
       // Low-end synth part for body
       const o = ac.createOscillator();
       o.type = 'square';
       o.frequency.setValueAtTime(120, now);
       o.frequency.exponentialRampToValueAtTime(80, now + 0.08);

       const synthGain = ac.createGain();
       synthGain.gain.setValueAtTime(0, now);
       synthGain.gain.linearRampToValueAtTime(0.3, now + 0.01);
       synthGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

       o.connect(synthGain).connect(ac.destination);
       o.start(now);
       o.stop(now + 0.1);
    }, [ensureAudioContext]);
    
    const playPlop = useCallback(() => {
        const ac = ensureAudioContext();
        if (!ac || ac.state !== 'running') return;
        const now = ac.currentTime;

        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(200, now);
        o.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        
        o.connect(g).connect(ac.destination);
        o.start(now);
        o.stop(now + 0.25);
    }, [ensureAudioContext]);

    const playPoke = useCallback(() => {
        const ac = ensureAudioContext();
        if (!ac || ac.state !== 'running') return;
        const now = ac.currentTime;

        const o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(300, now);
        o.frequency.exponentialRampToValueAtTime(150, now + 0.15);
        
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        
        o.connect(g).connect(ac.destination);
        o.start(now);
        o.stop(now + 0.2);
    }, [ensureAudioContext]);

    const playCelebrate = useCallback(() => {
        const ac = ensureAudioContext();
        if (!ac || ac.state !== 'running') return;
        const now = ac.currentTime;
        const tone = (freq: number, t0: number, dur: number, type: OscillatorType) => {
             const o = ac.createOscillator(), g = ac.createGain();
             o.type=type;
             o.frequency.setValueAtTime(freq, now+t0);
             g.gain.setValueAtTime(0.0001, now+t0);
             g.gain.exponentialRampToValueAtTime(0.38, now+t0+0.01);
             g.gain.exponentialRampToValueAtTime(0.0001, now+t0+dur);
             o.connect(g).connect(ac.destination);
             o.start(now+t0); o.stop(now+t0+dur+0.02);
        };
        const seq=[523.25,659.25,783.99,1046.5]; 
        for(let i=0; i<seq.length; i++) { tone(seq[i], i*0.12, 0.18, 'triangle'); }
        const chord=[523.25,659.25,783.99,987.77]; 
        for(let j=0; j<chord.length; j++) { tone(chord[j], 0.48, 0.6, 'square'); }
    }, [ensureAudioContext]);

    const playOverGoal = useCallback(() => playSound(beep(330, 0.15, 'triangle')), [playSound]);

    const AudioGate = () => (
        !isAudioUnlocked ? (
            React.createElement('button', {
                onClick: unlockAudio,
                className: "fixed bottom-3 right-3 bg-black border-4 border-[--blue-dark] shadow-[inset_0_0_0_4px_var(--border2)] text-[#ffd12b] py-2 px-2.5 rounded-md cursor-pointer z-80"
            }, 'ENABLE AUDIO')
        ) : null
    );

    return { playGulp, playCelebrate, playEat, playToast, unlockAudio, AudioGate, playOverGoal, playPlop, playPoke };
};

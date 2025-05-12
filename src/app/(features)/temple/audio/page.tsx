
'use client';

import { useState, useRef, useEffect } from 'react'; // Added useEffect
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Music, Play, Pause, Volume2, SkipForward, SkipBack, Download } from 'lucide-react';
import Link from 'next/link';
import { Slider } from "@/components/ui/slider";
import { useToast } from '@/hooks/use-toast';
import { mockAudioTracksData } from '@/mock-data'; // Import centralized mock data
import React from 'react'; // Ensure React is imported for JSX

export interface AudioTrack { // Export for mock data file
    id: string;
    title: string;
    artist: string;
    duration: number;
    audioUrl: string;
    imageUrl?: string;
    category: 'Aarti' | 'Mantra' | 'Bhajan';
}

export default function TempleAudioPage() {
    const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState([50]);
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const { toast } = useToast();

    const playTrack = (track: AudioTrack) => {
        if (audioRef.current) {
             if (currentTrack?.id === track.id && isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                if (currentTrack?.id !== track.id) {
                    audioRef.current.src = track.audioUrl;
                    setCurrentTrack(track);
                    setCurrentTime(0);
                }
                 audioRef.current.play().then(() => {
                    setIsPlaying(true);
                 }).catch(error => {
                     console.error("Error playing audio:", error);
                     toast({variant: "destructive", title: "Playback Error"});
                 });
            }
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeek = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.volume = value[0] / 100;
            setVolume(value);
        }
    };

    const formatTime = (time: number): string => {
        if (isNaN(time) || time === Infinity) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

     const handleDownload = (track: AudioTrack) => {
        toast({ title: "Download Started (Simulation)", description: `Downloading ${track.title}` });
        alert(`Simulating download of: ${track.audioUrl}`);
    }

    const handleNextTrack = () => {
        if (!currentTrack) return;
        const currentIndex = mockAudioTracksData.findIndex(t => t.id === currentTrack.id);
        const nextIndex = (currentIndex + 1) % mockAudioTracksData.length;
        playTrack(mockAudioTracksData[nextIndex]);
    }

    const handlePrevTrack = () => {
         if (!currentTrack) return;
        const currentIndex = mockAudioTracksData.findIndex(t => t.id === currentTrack.id);
        const prevIndex = (currentIndex - 1 + mockAudioTracksData.length) % mockAudioTracksData.length;
        playTrack(mockAudioTracksData[prevIndex]);
    }

    const groupedTracks = mockAudioTracksData.reduce((acc, track) => {
        if (!acc[track.category]) acc[track.category] = [];
        acc[track.category].push(track);
        return acc;
    }, {} as Record<string, AudioTrack[]>);
    const categories = Object.keys(groupedTracks);


    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/temple" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <Music className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Aartis &amp; Mantras</h1>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-32">
                 {categories.map(category => (
                    <Card key={category} className="shadow-md">
                        <CardHeader>
                            <CardTitle>{category}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             {groupedTracks[category].map(track => (
                                <div key={track.id} className="flex items-center justify-between p-2 rounded hover:bg-accent">
                                     <div className="flex items-center gap-3 overflow-hidden">
                                        {track.imageUrl && <img src={track.imageUrl} alt={track.title} className="w-10 h-10 rounded object-cover" data-ai-hint="audio track cover art"/>}
                                         <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate">{track.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playTrack(track)}>
                                             {(currentTrack?.id === track.id && isPlaying) ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                         </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(track)}>
                                            <Download className="h-4 w-4 text-muted-foreground"/>
                                          </Button>
                                    </div>
                                </div>
                             ))}
                        </CardContent>
                    </Card>
                 ))}

                <audio
                    ref={audioRef}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleTimeUpdate}
                    onEnded={handleNextTrack}
                    className="hidden"
                />
            </main>

            {currentTrack && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 shadow-lg z-50">
                    <div className="flex items-center gap-3 mb-2">
                         {currentTrack.imageUrl && <img src={currentTrack.imageUrl} alt={currentTrack.title} className="w-10 h-10 rounded object-cover" data-ai-hint="audio track cover art small"/>}
                        <div className="flex-grow overflow-hidden">
                            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                        </div>
                        <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevTrack}><SkipBack className="h-4 w-4"/></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playTrack(currentTrack)}>
                                  {isPlaying ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextTrack}><SkipForward className="h-4 w-4"/></Button>
                        </div>
                    </div>
                     <div className="flex items-center gap-2 text-xs">
                        <span>{formatTime(currentTime)}</span>
                        <Slider
                            value={[currentTime]}
                            max={duration || 100}
                            step={1}
                            onValueChange={handleSeek}
                            className="flex-grow"
                        />
                        <span>{formatTime(duration)}</span>
                         <Volume2 className="h-4 w-4 ml-2"/>
                         <Slider
                            value={volume}
                            max={100}
                            step={1}
                            onValueChange={handleVolumeChange}
                            className="w-20"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Music, Play, Pause, Volume2, SkipForward, SkipBack, Download } from 'lucide-react';
import Link from 'next/link';
import { Slider } from "@/components/ui/slider"; // Import Slider
import { useToast } from '@/hooks/use-toast';

// Mock Data (Replace with actual API for fetching audio files/metadata)
interface AudioTrack {
    id: string;
    title: string;
    artist: string; // e.g., Temple Name, Singer Name
    duration: number; // seconds
    audioUrl: string; // URL to the audio file (MP3, etc.)
    imageUrl?: string; // Optional image
    category: 'Aarti' | 'Mantra' | 'Bhajan';
}

const mockAudioTracks: AudioTrack[] = [
    { id: 'aarti1', title: 'Om Jai Jagdish Hare', artist: 'Various Artists', duration: 300, audioUrl: '/audio/om_jai_jagdish.mp3', category: 'Aarti', imageUrl: '/images/audio/aarti.jpg' },
    { id: 'mantra1', title: 'Gayatri Mantra (108 times)', artist: 'Traditional Chanting', duration: 900, audioUrl: '/audio/gayatri_mantra.mp3', category: 'Mantra', imageUrl: '/images/audio/mantra.jpg' },
    { id: 'bhajan1', title: 'Hanuman Chalisa', artist: 'Various Artists', duration: 600, audioUrl: '/audio/hanuman_chalisa.mp3', category: 'Bhajan', imageUrl: '/images/audio/bhajan.jpg' },
    { id: 'aarti2', title: 'Shirdi Sai Baba Aarti', artist: 'Temple Priests', duration: 450, audioUrl: '/audio/shirdi_aarti.mp3', category: 'Aarti', imageUrl: '/images/audio/shirdi.jpg' },
];

export default function TempleAudioPage() {
    const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState([50]);
    const audioRef = React.useRef&lt;HTMLAudioElement&gt;(null);
    const { toast } = useToast();

    const playTrack = (track: AudioTrack) => {
        if (audioRef.current) {
             if (currentTrack?.id === track.id && isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                // Load new track or resume paused track
                if (currentTrack?.id !== track.id) {
                    audioRef.current.src = track.audioUrl;
                    setCurrentTrack(track);
                    setCurrentTime(0); // Reset time for new track
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
        return `${minutes}:${seconds &lt; 10 ? '0' : ''}${seconds}`;
    };

     const handleDownload = (track: AudioTrack) => {
        // In a real app, provide a secure download link or mechanism
        toast({ title: "Download Started (Simulation)", description: `Downloading ${track.title}` });
        // window.location.href = track.audioUrl; // This might not work depending on CORS/server setup
        alert(`Simulating download of: ${track.audioUrl}`);
    }

    const handleNextTrack = () => {
        if (!currentTrack) return;
        const currentIndex = mockAudioTracks.findIndex(t => t.id === currentTrack.id);
        const nextIndex = (currentIndex + 1) % mockAudioTracks.length;
        playTrack(mockAudioTracks[nextIndex]);
    }

    const handlePrevTrack = () => {
         if (!currentTrack) return;
        const currentIndex = mockAudioTracks.findIndex(t => t.id === currentTrack.id);
        const prevIndex = (currentIndex - 1 + mockAudioTracks.length) % mockAudioTracks.length;
        playTrack(mockAudioTracks[prevIndex]);
    }

    // Group tracks by category
    const groupedTracks = mockAudioTracks.reduce((acc, track) => {
        if (!acc[track.category]) acc[track.category] = [];
        acc[track.category].push(track);
        return acc;
    }, {} as Record&lt;string, AudioTrack[]&gt;);
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
            <main className="flex-grow p-4 space-y-4 pb-32"> {/* Added padding-bottom */}
                 {categories.map(category => (
                    <Card key={category} className="shadow-md">
                        <CardHeader>
                            <CardTitle>{category}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             {groupedTracks[category].map(track => (
                                <div key={track.id} className="flex items-center justify-between p-2 rounded hover:bg-accent">
                                     <div className="flex items-center gap-3 overflow-hidden">
                                        {track.imageUrl && &lt;img src={track.imageUrl} alt={track.title} className="w-10 h-10 rounded object-cover" data-ai-hint="audio track cover art"/&gt;}
                                         <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate">{track.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        &lt;Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playTrack(track)}&gt;
                                             {(currentTrack?.id === track.id && isPlaying) ? &lt;Pause className="h-4 w-4" /&gt; : &lt;Play className="h-4 w-4" /&gt;}
                                         &lt;/Button&gt;
                                          &lt;Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(track)}&gt;
                                            &lt;Download className="h-4 w-4 text-muted-foreground"/&gt;
                                          &lt;/Button&gt;
                                    </div>
                                </div>
                             ))}
                        </CardContent>
                    </Card>
                 ))}

                {/* Hidden Audio Element */}
                &lt;audio
                    ref={audioRef}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleTimeUpdate} // Update duration when metadata loads
                    onEnded={handleNextTrack} // Play next track when current ends
                    className="hidden"
                /&gt;
            </main>

            {/* Fixed Mini Player */}
            {currentTrack && (
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 shadow-lg z-50">
                    <div className="flex items-center gap-3 mb-2">
                         {currentTrack.imageUrl && &lt;img src={currentTrack.imageUrl} alt={currentTrack.title} className="w-10 h-10 rounded object-cover" data-ai-hint="audio track cover art small"/&gt;}
                        <div className="flex-grow overflow-hidden">
                            <p className="text-sm font-medium truncate">{currentTrack.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
                        </div>
                        <div className="flex items-center gap-1">
                              &lt;Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevTrack}&gt;&lt;SkipBack className="h-4 w-4"/&gt;&lt;/Button&gt;
                              &lt;Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playTrack(currentTrack)}&gt;
                                  {isPlaying ? &lt;Pause className="h-5 w-5"/&gt; : &lt;Play className="h-5 w-5"/&gt;}
                              &lt;/Button&gt;
                              &lt;Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextTrack}&gt;&lt;SkipForward className="h-4 w-4"/&gt;&lt;/Button&gt;
                        </div>
                    </div>
                     <div className="flex items-center gap-2 text-xs">
                        <span>{formatTime(currentTime)}</span>
                        &lt;Slider
                            value={[currentTime]}
                            max={duration || 100} // Use duration, fallback to 100
                            step={1}
                            onValueChange={handleSeek}
                            className="flex-grow"
                        /&gt;
                        <span>{formatTime(duration)}</span>
                         &lt;Volume2 className="h-4 w-4 ml-2"/&gt;
                         &lt;Slider
                            value={volume}
                            max={100}
                            step={1}
                            onValueChange={handleVolumeChange}
                            className="w-20"
                        /&gt;
                    </div>
                </div>
            )}
        </div>
    );
}

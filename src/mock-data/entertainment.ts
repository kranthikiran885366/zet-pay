
import type { Movie } from '@/app/(features)/movies/page'; // Assuming type definition
import { addDays } from 'date-fns';

export const mockEntertainmentMoviesData: Movie[] = [
    { id: 'm1', title: "Action Movie Alpha", genre: "Action/Thriller", language: "English", rating: "UA", duration: "2h 15m", imageUrl: "https://picsum.photos/seed/alpha/300/450", dataAiHint:"action movie poster" },
    { id: 'm2', title: "Comedy Fest", genre: "Comedy/Romance", language: "Hindi", rating: "U", duration: "2h 05m", imageUrl: "https://picsum.photos/seed/comedy/300/450", dataAiHint:"comedy movie poster" },
    { id: 'm5', title: "Upcoming Hero", genre: "Superhero", language: "English", rating: "UA", duration: "N/A", imageUrl: "https://picsum.photos/seed/upcoming/300/450", releaseDate: addDays(new Date(), 14), isUpcoming: true, dataAiHint:"superhero movie poster upcoming" },
];

export interface Event {
    id: string;
    name: string;
    category: 'Comedy' | 'Sports' | 'Music' | 'Workshop';
    date: string;
    city: string;
    venue: string;
    price: number;
    imageUrl: string;
}

export const mockEventsData: Event[] = [
    { id: 'ev1', name: 'Standup Comedy Night', category: 'Comedy', date: '2024-08-20', city: 'Bangalore', venue: 'Comedy Club', price: 499, imageUrl: 'https://picsum.photos/seed/comedy_event/400/250' },
    { id: 'ev2', name: 'Live Music Concert', category: 'Music', date: '2024-08-25', city: 'Mumbai', venue: 'Arena Stadium', price: 1200, imageUrl: 'https://picsum.photos/seed/music_event/400/250' },
];

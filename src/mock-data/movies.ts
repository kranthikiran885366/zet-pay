
import type { Movie, Cinema, Showtime } from '@/app/(features)/movies/page'; // Assuming types are exported from page
import { addDays } from 'date-fns';

export const mockMoviesData: Movie[] = [
    { id: 'm1', title: "Action Movie Alpha", genre: "Action/Thriller", language: "English", rating: "UA", duration: "2h 15m", imageUrl: "https://picsum.photos/seed/alpha/300/450", dataAiHint:"action movie poster" },
    { id: 'm2', title: "Comedy Fest", genre: "Comedy/Romance", language: "Hindi", rating: "U", duration: "2h 05m", imageUrl: "https://picsum.photos/seed/comedy/300/450", dataAiHint:"comedy movie poster" },
    { id: 'm3', title: "Sci-Fi Voyager", genre: "Sci-Fi/Adventure", language: "English", rating: "UA", duration: "2h 45m", imageUrl: "https://picsum.photos/seed/scifi/300/450", dataAiHint:"science fiction movie poster" },
    { id: 'm4', title: "Drama Queen", genre: "Drama", language: "Tamil", rating: "A", duration: "2h 20m", imageUrl: "https://picsum.photos/seed/drama/300/450", dataAiHint:"drama movie poster" },
    { id: 'm5', title: "Upcoming Hero", genre: "Superhero", language: "English", rating: "UA", duration: "N/A", imageUrl: "https://picsum.photos/seed/upcoming/300/450", releaseDate: addDays(new Date(), 14), isUpcoming: true, dataAiHint:"superhero movie poster upcoming" },
];

export const mockCinemasData: Cinema[] = [
    { id: 'c1', name: "PVR Orion Mall", location: "Rajajinagar", amenities: ['IMAX', 'Recliner Seats'] },
    { id: 'c2', name: "INOX Garuda Mall", location: "MG Road", amenities: ['Dolby Atmos'] },
    { id: 'c3', name: "Cinepolis Forum Shantiniketan", location: "Whitefield", amenities: ['4DX'] },
];

export const mockShowtimesData: { [cinemaId: string]: Showtime[] } = {
    'c1': [
        { time: "10:00 AM", format: "IMAX 2D", price: 450 },
        { time: "01:15 PM", format: "IMAX 2D", price: 450, isFillingFast: true },
        { time: "04:30 PM", format: "2D", price: 300 },
        { time: "07:45 PM", format: "IMAX 2D", price: 500, isAlmostFull: true },
        { time: "11:00 PM", format: "2D", price: 250 },
    ],
    'c2': [
        { time: "11:30 AM", format: "Dolby Atmos 2D", price: 350 },
        { time: "02:45 PM", format: "Dolby Atmos 2D", price: 350, isFillingFast: true },
        { time: "06:00 PM", format: "2D", price: 280 },
        { time: "09:15 PM", format: "Dolby Atmos 2D", price: 400 },
    ],
    'c3': [
        { time: "10:45 AM", format: "4DX 3D", price: 600 },
        { time: "01:50 PM", format: "2D", price: 250 },
        { time: "05:00 PM", format: "4DX 3D", price: 650, isFillingFast: true },
        { time: "08:10 PM", format: "2D", price: 300 },
    ],
};

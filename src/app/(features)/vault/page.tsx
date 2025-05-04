'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FolderLock, FileText, Ticket, CloudUpload, Search, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Mock Data for Vault Items
interface VaultItem {
    id: string;
    name: string;
    type: 'Ticket' | 'Bill' | 'Document' | 'Plan';
    source: string; // e.g., 'Train Booking', 'Electricity Bill'
    dateAdded: string; // ISO String
    fileUrl?: string; // Link to actual file (optional for demo)
    previewUrl?: string; // Optional image preview
}

const mockVaultItems: VaultItem[] = [
    { id: 'v1', name: 'Bangalore to Chennai Train Ticket', type: 'Ticket', source: 'Train Booking', dateAdded: new Date(Date.now() - 86400000 * 2).toISOString(), previewUrl: '/images/tickets/train_ticket_thumb.png' },
    { id: 'v2', name: 'Electricity Bill - June 2024', type: 'Bill', source: 'Electricity Bill', dateAdded: new Date(Date.now() - 86400000 * 5).toISOString(), previewUrl: '/images/bills/electricity_bill_thumb.png'},
    { id: 'v3', name: 'Movie Ticket - Action Movie Alpha', type: 'Ticket', source: 'Movie Booking', dateAdded: new Date(Date.now() - 86400000 * 1).toISOString(), previewUrl: '/images/tickets/movie_ticket_thumb.png'},
     { id: 'v4', name: 'Mobile Recharge Plan - Jio 299', type: 'Plan', source: 'Mobile Recharge', dateAdded: new Date(Date.now() - 86400000 * 10).toISOString() },
];

export default function SecureVaultPage() {
    const [items, setItems] = useState<VaultItem[]>(mockVaultItems);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.source.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleUpload = () => {
        // TODO: Implement file upload functionality
        alert('File upload functionality not implemented yet.');
    };

    const viewItem = (item: VaultItem) => {
        // TODO: Implement viewing item details/file
        alert(`Viewing item: ${item.name}`);
    };

    return (
        <div className="min-h-screen bg-secondary flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-3 flex items-center gap-4 shadow-md">
                <Link href="/services" passHref>
                    <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <FolderLock className="h-6 w-6" />
                <h1 className="text-lg font-semibold">Secure Vault</h1>
                 <Button variant="secondary" size="sm" className="ml-auto h-8" onClick={handleUpload}>
                    <CloudUpload className="mr-2 h-4 w-4" /> Upload
                 </Button>
            </header>

            {/* Main Content */}
            <main className="flex-grow p-4 space-y-4 pb-20">
                 {/* Search Bar */}
                 <Input
                    type="search"
                    placeholder="Search documents, tickets, bills..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* Vault Items List */}
                {filteredItems.length === 0 ? (
                     <Card className="shadow-md text-center">
                         <CardContent className="p-6">
                             <FolderLock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground">
                                {searchTerm ? 'No items found matching your search.' : 'Your Secure Vault is empty.'}
                              </p>
                             <p className="text-xs text-muted-foreground mt-1">Upload important documents, tickets, and bills for secure storage.</p>
                         </CardContent>
                     </Card>
                ) : (
                    <div className="space-y-3">
                        {filteredItems.map(item => (
                             <Card key={item.id} className="shadow-sm p-3 flex items-center gap-3 cursor-pointer hover:bg-card/90" onClick={() => viewItem(item)}>
                                 {/* Icon based on type */}
                                 <div className="p-2 bg-muted rounded-md">
                                     {item.type === 'Ticket' && <Ticket className="h-5 w-5 text-primary" />}
                                     {item.type === 'Bill' && <FileText className="h-5 w-5 text-primary" />}
                                     {item.type === 'Document' && <FileText className="h-5 w-5 text-primary" />}
                                     {item.type === 'Plan' && <FileText className="h-5 w-5 text-primary" />}
                                 </div>
                                 <div className="flex-grow overflow-hidden">
                                     <p className="text-sm font-medium truncate">{item.name}</p>
                                     <p className="text-xs text-muted-foreground">{item.source} • Added {format(new Date(item.dateAdded), 'PP')}</p>
                                 </div>
                                 <Badge variant="outline">{item.type}</Badge>
                             </Card>
                        ))}
                    </div>
                )}

                {/* Info Card */}
                 <Card className="shadow-md border-blue-500 mt-6">
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2 text-blue-700"><Info className="h-5 w-5"/> About Secure Vault</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                        <p>Securely store your important documents like tickets, bills, insurance papers, and more.</p>
                        <p>Items are automatically backed up to the cloud (using secure storage).</p>
                        <p>Easily access your documents anytime, anywhere.</p>
                    </CardContent>
                </Card>

            </main>
        </div>
    );
}

// Helper function to format date (already imported from date-fns)
import { format } from 'date-fns';

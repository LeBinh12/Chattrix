export interface Order {
    id: string;
    invoice: string;
    date: string;
    status: 'Paid' | 'Refunded' | 'Cancelled';
    customer: {
        initial: string;
        name: string;
        email: string;
    };
}

export const ordersData: Order[] = [
    { id: '1', invoice: 'INV-1234', date: 'Feb 3, 2023', status: 'Refunded', customer: { initial: 'O', name: 'Olivia Ryhe', email: 'olivia@email.com' } },
    { id: '2', invoice: 'INV-1233', date: 'Feb 3, 2023', status: 'Paid', customer: { initial: 'S', name: 'Steve Hampton', email: 'steve.hampton@email.com' } },
    { id: '3', invoice: 'INV-1232', date: 'Feb 3, 2023', status: 'Refunded', customer: { initial: 'C', name: 'Ciaran Murray', email: 'ciaran.murray@email.com' } },
    { id: '4', invoice: 'INV-1231', date: 'Feb 3, 2023', status: 'Refunded', customer: { initial: 'M', name: 'Maria Macdonald', email: 'maria.mc@email.com' } },
    { id: '5', invoice: 'INV-1230', date: 'Feb 3, 2023', status: 'Cancelled', customer: { initial: 'C', name: 'Charles Fulton', email: 'fulton@email.com' } },
    { id: '6', invoice: 'INV-1229', date: 'Feb 3, 2023', status: 'Cancelled', customer: { initial: 'J', name: 'Jay Hooper', email: 'hooper@email.com' } },
    { id: '7', invoice: 'INV-1228', date: 'Feb 3, 2023', status: 'Refunded', customer: { initial: 'K', name: 'Krystal Stevens', email: 'k.stevens@email.com' } },
    { id: '8', invoice: 'INV-1227', date: 'Feb 3, 2023', status: 'Paid', customer: { initial: 'S', name: 'Sach Flyn', email: 's.flyn@email.com' } },
    { id: '9', invoice: 'INV-1226', date: 'Feb 3, 2023', status: 'Cancelled', customer: { initial: 'B', name: 'Bradley Rosales', email: 'bradley.rosales@email.com' } },
];
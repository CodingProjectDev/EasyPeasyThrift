'use client';
import Link from 'next/link';
import { BarChart3, Boxes, LogOut, Package, Percent, Settings, ShoppingCart, Users } from 'lucide-react';

const nav=[['Dashboard','/admin',BarChart3],['Products','/admin/products',Package],['Orders','/admin/orders',ShoppingCart],['Inventory','/admin/inventory',Boxes],['Customers','/admin/customers',Users],['Discounts','/admin/discounts',Percent],['Settings','/admin/settings',Settings]] as const;
export default function AdminShell({children}:{children:React.ReactNode}){return <div className="admin-main"><div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand">EasyPeasy—Admin</div><nav className="admin-nav">{nav.map(([label,href,Icon])=><Link href={href} key={href}><Icon size={17}/><span>{label}</span></Link>)}</nav><form className="logout" action="/api/admin/logout" method="post"><button className="btn ghost" style={{width:'100%',color:'white',borderColor:'#45453f'}}><LogOut size={16}/> Sign out</button></form></aside><section className="admin-content">{children}</section></div></div>}

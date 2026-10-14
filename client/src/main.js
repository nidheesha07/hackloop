import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { Search, ShoppingBag, CalendarClock, Headphones, Menu, Heart, Gavel, ArrowUpRight, Bell, UserRound, Plus, Clock3, ShieldCheck, Star, X, Radio } from "lucide-react";
import "./styles.css";

const API = "http://localhost:4000";
const money = n => `₹${Number(n).toLocaleString("en-IN")}`;

function App() {
  const [products, setProducts] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeTab, setActiveTab] = useState("Discover");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [bidInputs, setBidInputs] = useState({});
  const [bidder, setBidder] = useState("Guest-21");
  const [modal, setModal] = useState(null);

  const refresh = async () => {
    try {
      const [p, a, r] = await Promise.all([
        fetch(`${API}/api/products`).then(x => x.json()),
        fetch(`${API}/api/auctions`).then(x => x.json()),
        fetch(`${API}/api/reservations`).then(x => x.json())
      ]);
      setProducts(p); setAuctions(a); setReservations(r);
    } catch { setToast("Can't reach the API. Start the server in the /server folder."); }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const socket = io(API);
    socket.on("bid:update", update => setAuctions(old => old.map(a => a.id === update.auctionId ? { ...a, currentBid: update.currentBid, bids: [...a.bids, update.bid] } : a)));
    return () => socket.disconnect();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => products.filter(p => `${p.name} ${p.category} ${p.seller}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const liveAuctions = auctions.filter(a => a.status === "live");
  const addCart = product => { setCart(old => [...old, product]); setToast(`${product.name} added to your cart`); };
  const reserve = async auction => {
    try {
      const response = await fetch(`${API}/api/reservations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auctionId: auction.id, name: bidder }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reserve");
      setReservations(old => [...old, data]); setToast(`Reservation saved for ${auction.title}`);
    } catch (e) { setToast(e.message); }
  };
  const placeBid = async auction => {
    try {
      const amount = Number(bidInputs[auction.id]);
      const response = await fetch(`${API}/api/auctions/${auction.id}/bids`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bidder, amount }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bid failed");
      setAuctions(old => old.map(a => a.id === auction.id ? data.auction : a));
      setBidInputs(old => ({ ...old, [auction.id]: "" }));
      setToast("Bid placed. Good luck!");
    } catch (e) { setToast(e.message); }
  };

  const go = tab => { setActiveTab(tab); setModal(null); };
  const auctionProduct = id => products.find(p => p.id === id);
  return <div className="app-shell">
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={() => setModal({type:"menu"})} aria-label="Open menu"><Menu /></button>
      <button className="brand" onClick={() => go("Discover")}><span className="brand-mark">V</span><span>veyra<span className="brand-dot">.</span></span></button>
      <nav className="main-nav">
        {["Discover", "Live Auctions", "Shop"].map(t => <button key={t} className={activeTab === t ? "nav-link active" : "nav-link"} onClick={() => go(t)}>{t}{t === "Live Auctions" && <span className="live-dot"/>}</button>)}
      </nav>
      <div className="searchbox"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search rare finds, creators..." /></div>
      <div className="header-actions">
        <button className="icon-button" title="My auction reservations" onClick={() => go("My Reservations")}><CalendarClock/><span className="action-label">Reservations</span>{reservations.length > 0 && <i className="count">{reservations.length}</i>}</button>
        <button className="icon-button" title="Cart" onClick={() => go("My Cart")}><ShoppingBag/><span className="action-label">Cart</span>{cart.length > 0 && <i className="count">{cart.length}</i>}</button>
        <button className="avatar" title="Seller account" onClick={() => go("Seller Account")}><UserRound size={18}/></button>
      </div>
    </header>

    <main>
      {activeTab === "Discover" && <>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line"/> THE ART OF THE FIND</div>
            <h1>Not just owned.<br/><em>Won.</em></h1>
            <p>Discover objects with a story. Shop your favourites or step into the thrill of a live auction.</p>
            <div className="hero-actions"><button className="primary-btn" onClick={() => go("Live Auctions")}>Explore live auctions <ArrowUpRight size={17}/></button><button className="text-btn" onClick={() => go("Shop")}>Shop collections <span>↗</span></button></div>
            <div className="hero-stats"><div><strong>LIVE</strong><span>Auctions happening</span></div><div><strong>One of a kind.</strong><span>Finds worth chasing</span></div></div>
          </div>
          <div className="hero-art"><img src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=85" alt="Sunglasses and accessories arranged on a dark surface"/><div className="hero-image-shade"/><div className="floating-card"><span className="mini-live"><i/> LIVE NOW</span><strong>Every bid tells a story.</strong><span>Find your next favourite.</span></div><div className="vertical-note">CURATED FINDS · REAL-TIME THRILL</div></div>
        </section>
        <section className="section-head"><div><div className="eyebrow">IN THE SPOTLIGHT</div><h2>Finds worth <em>fighting for.</em></h2></div><button className="subtle-link" onClick={() => go("Live Auctions")}>View all auctions <ArrowUpRight size={16}/></button></section>
        <AuctionGrid auctions={liveAuctions.slice(0,2)} products={products} reserve={reserve} placeBid={placeBid} bidInputs={bidInputs} setBidInputs={setBidInputs} />
        <section className="section-head product-heading"><div><div className="eyebrow">THE GOOD STUFF</div><h2>Objects with <em>character.</em></h2></div><button className="subtle-link" onClick={() => go("Shop")}>Explore all <ArrowUpRight size={16}/></button></section>
        <ProductGrid products={filtered.slice(0,4)} addCart={addCart} openSeller={() => go("Seller Account")}/>
      </>}
      {activeTab === "Live Auctions" && <><PageHeading eyebrow="THE FLOOR IS OPEN" title={<>Live <em>auctions.</em></>} desc="Place your bid, keep an eye on the room, and make your move."/><AuctionGrid auctions={auctions} products={products} reserve={reserve} placeBid={placeBid} bidInputs={bidInputs} setBidInputs={setBidInputs}/></>}
      {activeTab === "Shop" && <><PageHeading eyebrow="CURATED FOR THE CURIOUS" title={<>Shop the <em>unexpected.</em></>} desc="A collection of objects that deserve a second look."/><ProductGrid products={filtered} addCart={addCart} openSeller={() => go("Seller Account")}/></>}
      {activeTab === "My Reservations" && <><PageHeading eyebrow="YOUR NEXT MOMENT" title={<>Auction <em>reservations.</em></>} desc="Your saved auctions live here. Reminder delivery is a demo in this version."/><div className="reservation-list">{reservations.length ? reservations.map(r => <div className="reservation-row" key={r.id}><div className="reservation-icon"><Bell/></div><div className="reservation-info"><strong>{r.auctionTitle}</strong><span>Reserved by {r.name} · Reminder enabled (demo)</span></div><button className="outline-btn" onClick={() => go("Live Auctions")}>View auction</button></div>) : <Empty title="Nothing on your calendar yet" desc="Reserve a live or upcoming auction to find it here." action={() => go("Live Auctions")} actionLabel="Browse auctions"/>}</div></>}
      {activeTab === "My Cart" && <><PageHeading eyebrow="YOUR SHORTLIST" title={<>The <em>cart.</em></>} desc="A few good finds, all in one place."/><div className="cart-list">{cart.length ? <>{cart.map((p,i) => <div className="cart-row" key={`${p.id}-${i}`}><img src={p.image} alt={p.name}/><div className="cart-info"><strong>{p.name}</strong><span>{p.seller}</span><b>{money(p.price)}</b></div><button className="icon-button" onClick={() => setCart(old => old.filter((_,j) => i !== j))}><X/></button></div>)}<div className="cart-total"><span>Subtotal</span><strong>{money(cart.reduce((sum,p) => sum+p.price,0))}</strong></div><button className="primary-btn" onClick={() => setToast("Checkout is not connected in this demo.")}>Continue to checkout <ArrowUpRight size={17}/></button></> : <Empty title="Your cart is taking a nap" desc="Browse the shop and bring something home." action={() => go("Shop")} actionLabel="Explore the shop"/>}</div></>}
      {activeTab === "Seller Account" && <SellerPanel products={products} go={go}/>}
      {activeTab === "Help & Contact" && <><PageHeading eyebrow="WE'RE HERE" title={<>Help, without the <em>hassle.</em></>} desc="This demo contact form is local only; it does not send messages."/><div className="contact-card"><label>Your email<input placeholder="you@example.com" type="email"/></label><label>What can we help with?<select><option>Auctions and bidding</option><option>Orders and payments</option><option>Seller account</option><option>Something else</option></select></label><label>Message<textarea placeholder="Tell us what's up..." rows="4"/></label><button className="primary-btn" onClick={() => setToast("Demo only: connect a support API to send this message.")}>Send message <ArrowUpRight size={17}/></button></div></>}
    </main>
    <footer><div className="footer-brand"><span className="brand-mark">V</span><span>veyra.</span></div><span>Find it. Feel it. Bid on it.</span><button onClick={() => go("Help & Contact")}><Headphones size={16}/> Help & Contact</button><span className="copyright">© 2026 Veyra · Marketplace concept</span></footer>
    {modal?.type === "menu" && <div className="modal-backdrop" onClick={() => setModal(null)}><div className="menu-modal" onClick={e => e.stopPropagation()}><button className="close-modal" onClick={() => setModal(null)}><X/></button>{["Discover","Live Auctions","Shop","My Reservations","My Cart","Seller Account","Help & Contact"].map(t=><button key={t} onClick={() => go(t)}>{t}<ArrowUpRight size={15}/></button>)}</div></div>}
    {toast && <div className="toast"><span className="toast-mark">V</span>{toast}<button onClick={() => setToast("")}><X size={15}/></button></div>}
  </div>;
}

function PageHeading({eyebrow,title,desc}) { return <section className="page-heading"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></section>; }
function AuctionGrid({auctions,products,reserve,placeBid,bidInputs,setBidInputs}) {
  if (!auctions.length) return <Empty title="No auctions here just yet" desc="Try another section or check back soon."/>;
  return <div className="auction-grid">{auctions.map(a => { const p=products.find(x=>x.id===a.productId); if(!p) return null; return <article className="auction-card" key={a.id}><div className="auction-image"><img src={p.image} alt={p.name}/><span className={a.status==="live"?"status-pill is-live":"status-pill"}>{a.status==="live"&&<i/>}{a.status==="live"?"LIVE AUCTION":"UPCOMING"}</span><button className="heart-btn" title="Save item"><Heart size={17}/></button><span className="auction-category">{p.category}</span></div><div className="auction-body"><div className="auction-meta"><span>SELLER · {a.seller}</span><span><Clock3 size={13}/> {a.status==="live"?"Closes soon":"Scheduled"}</span></div><h3>{a.title}</h3><div className="bid-row"><div><span className="muted-label">CURRENT BID</span><strong>{money(a.currentBid)}</strong></div><div className="bid-count"><Gavel size={15}/>{a.bids.length} bids</div></div>{a.status==="live"?<div className="bid-controls"><input aria-label="Your bid" type="number" min={a.currentBid+1} placeholder={`Bid above ${a.currentBid}`} value={bidInputs[a.id]||""} onChange={e=>setBidInputs(old=>({...old,[a.id]:e.target.value}))}/><button className="primary-btn bid-button" onClick={()=>placeBid(a)}>Place bid <ArrowUpRight size={15}/></button></div>:<button className="outline-btn reserve-btn" onClick={()=>reserve(a)}><CalendarClock size={16}/> Reserve & remind me</button>}</div></article>; })}</div>;
}
function ProductGrid({products,addCart,openSeller}) {
  if (!products.length) return <Empty title="No matching finds" desc="Try a different search term."/>;
  return <div className="product-grid">{products.map(p=><article className="product-card" key={p.id}><div className="product-image"><img src={p.image} alt={p.name}/><button className="heart-btn" title="Save item"><Heart size={17}/></button><span className="product-tag">{p.category}</span></div><div className="product-info"><button className="seller-link" onClick={openSeller}>{p.seller} <ArrowUpRight size={12}/></button><h3>{p.name}</h3><div className="product-bottom"><strong>{money(p.price)}</strong><button className="add-btn" onClick={()=>addCart(p)}><Plus size={15}/> Add to cart</button></div></div></article>)}</div>;
}
function SellerPanel({products,go}) {
  const [seller,setSeller] = useState("s1");
  const [details,setDetails] = useState(null);
  useEffect(()=>{fetch(`${API}/api/sellers/${seller}`).then(r=>r.json()).then(setDetails).catch(()=>setDetails(null));},[seller]);
  return <><PageHeading eyebrow="YOUR SELLER SPACE" title={<>The seller <em>studio.</em></>} desc="Product listings, demo sales history, and buyer reviews."/><div className="seller-toolbar"><div className="seller-profile"><div className="seller-avatar"><UserRound/></div><div><strong>{seller==="s1"?"Northstar Finds":seller==="s2"?"Analog Room":"Form & Function"}</strong><span>Seller account · Demo view</span></div></div><select value={seller} onChange={e=>setSeller(e.target.value)}><option value="s1">Northstar Finds</option><option value="s2">Analog Room</option><option value="s3">Form & Function</option></select></div><div className="seller-stats"><div><span>LISTED PRODUCTS</span><strong>{details?.products?.length ?? "—"}</strong></div><div><span>SELLING HISTORY</span><strong>{details?.soldHistory?.length ?? "—"}</strong></div><div><span>BUYER REVIEWS</span><strong>{details?.reviews?.length ?? "—"}</strong></div></div><section className="seller-section"><h2>Product history</h2><div className="history-list">{(details?.soldHistory||[]).map((h,i)=><div className="history-row" key={i}><span className="history-check"><ShieldCheck/></span><strong>{h.product}</strong><span>{h.status}</span><span>{h.date}</span></div>)}</div></section><section className="seller-section"><h2>Buyer reviews</h2>{details?.reviews?.length ? details.reviews.map(r=><div className="review-row" key={r.id}><div className="review-top"><strong>{r.author}</strong><span>{[1,2,3,4,5].map(n=><Star key={n} size={13} fill={n<=r.rating?"currentColor":"none"}/>)}</span></div><p>{r.text}</p></div>) : <p className="empty-note">No reviews yet.</p>}</section><button className="outline-btn" onClick={()=>go("Shop")}>Browse marketplace <ArrowUpRight size={15}/></button></>;
}
function Empty({title,desc,action,actionLabel}) { return <div className="empty-state"><div className="empty-icon"><Radio/></div><h3>{title}</h3><p>{desc}</p>{action&&<button className="primary-btn" onClick={action}>{actionLabel}<ArrowUpRight size={15}/></button>}</div>; }

createRoot(document.getElementById("root")).render(<App />);

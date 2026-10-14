import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomUUID } from "node:crypto";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "http://localhost:5173" } });

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const now = Date.now();
const products = [
  { id: "p1", name: "Midnight Chronograph", category: "Watches", price: 12500, image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80", sellerId: "s1", seller: "Northstar Finds", description: "A striking timepiece offered in a live auction." },
  { id: "p2", name: "Retro Film Camera", category: "Electronics", price: 7200, image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80", sellerId: "s2", seller: "Analog Room", description: "A classic camera for collectors and creative minds." },
  { id: "p3", name: "Sculptural Desk Lamp", category: "Home", price: 2800, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80", sellerId: "s3", seller: "Form & Function", description: "Minimal design with a warm, inviting glow." },
  { id: "p4", name: "Collector Sneakers", category: "Fashion", price: 5400, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80", sellerId: "s1", seller: "Northstar Finds", description: "A bold pair for a carefully curated collection." }
];

const auctions = [
  { id: "a1", productId: "p1", title: "Midnight Chronograph", seller: "Northstar Finds", currentBid: 12800, startingBid: 10000, endsAt: new Date(now + 1000 * 60 * 22).toISOString(), status: "live", bids: [{ id: randomUUID(), bidder: "Guest-41", amount: 12800, at: new Date().toISOString() }] },
  { id: "a2", productId: "p2", title: "Retro Film Camera", seller: "Analog Room", currentBid: 7200, startingBid: 6500, endsAt: new Date(now + 1000 * 60 * 48).toISOString(), status: "live", bids: [] },
  { id: "a3", productId: "p3", title: "Sculptural Desk Lamp", seller: "Form & Function", currentBid: 2800, startingBid: 2000, endsAt: new Date(now + 1000 * 60 * 60 * 4).toISOString(), status: "scheduled", bids: [] }
];

const reservations = [];
const reviews = [
  { id: "r1", sellerId: "s1", author: "Mira", rating: 5, text: "Clear description and quick responses." },
  { id: "r2", sellerId: "s2", author: "Dev", rating: 4, text: "Packed carefully and exactly as described." }
];

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "Veyra API" }));
app.get("/api/products", (_req, res) => res.json(products));
app.get("/api/auctions", (_req, res) => res.json(auctions));
app.get("/api/reservations", (_req, res) => res.json(reservations));
app.get("/api/reviews", (_req, res) => res.json(reviews));
app.get("/api/sellers/:sellerId", (req, res) => {
  const sellerProducts = products.filter(p => p.sellerId === req.params.sellerId);
  const sellerReviews = reviews.filter(r => r.sellerId === req.params.sellerId);
  res.json({ products: sellerProducts, reviews: sellerReviews, soldHistory: sellerProducts.map(p => ({ product: p.name, status: "Demo history", date: "—" })) });
});

app.post("/api/reservations", (req, res) => {
  const { auctionId, name } = req.body ?? {};
  const auction = auctions.find(a => a.id === auctionId);
  if (!auction) return res.status(404).json({ error: "Auction not found" });
  const reservation = { id: randomUUID(), auctionId, auctionTitle: auction.title, name: String(name || "Guest").slice(0, 50), reminder: true, createdAt: new Date().toISOString() };
  reservations.push(reservation);
  res.status(201).json(reservation);
});

app.post("/api/auctions/:auctionId/bids", (req, res) => {
  const auction = auctions.find(a => a.id === req.params.auctionId);
  if (!auction) return res.status(404).json({ error: "Auction not found" });
  if (auction.status !== "live") return res.status(400).json({ error: "This auction is not live yet" });
  const bidder = String(req.body?.bidder || "Guest").trim().slice(0, 40) || "Guest";
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= auction.currentBid) {
    return res.status(400).json({ error: `Your bid must be higher than ₹${auction.currentBid.toLocaleString("en-IN")}` });
  }
  // Demo only: in production, enforce atomic bid updates in a persistent database.
  auction.currentBid = amount;
  const bid = { id: randomUUID(), bidder, amount, at: new Date().toISOString() };
  auction.bids.push(bid);
  io.emit("bid:update", { auctionId: auction.id, currentBid: auction.currentBid, bid });
  res.status(201).json({ auction, bid });
});

io.on("connection", socket => {
  socket.emit("connected", { message: "Connected to Veyra live updates" });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Veyra API running at http://localhost:${PORT}`));

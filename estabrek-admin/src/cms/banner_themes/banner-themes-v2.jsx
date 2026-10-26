import { useState, useEffect, useRef } from "react";

export const bannerThemes = [
  // ═══════════════════════════════════════════
  // 🍬 CANDY & E-COMMERCE THEMES (1-20)
  // ═══════════════════════════════════════════
  
  // 1. Cotton Candy Dream
  {
    id: 1,
    name: "Cotton Candy Dream",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 25%, #e1bee7 50%, #b3e5fc 75%, #b2ebf2 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <filter id="cc_blur"><feGaussianBlur stdDeviation="15"/></filter>
            <radialGradient id="cc_g1"><stop offset="0%" stopColor="#f48fb1" stopOpacity="0.6"/><stop offset="100%" stopColor="transparent"/></radialGradient>
            <radialGradient id="cc_g2"><stop offset="0%" stopColor="#ce93d8" stopOpacity="0.5"/><stop offset="100%" stopColor="transparent"/></radialGradient>
          </defs>
          {/* Floating cotton candy blobs */}
          <circle cx="150" cy="80" r="80" fill="url(#cc_g1)" filter="url(#cc_blur)">
            <animate attributeName="cx" values="150;180;150" dur="8s" repeatCount="indefinite"/>
            <animate attributeName="cy" values="80;100;80" dur="6s" repeatCount="indefinite"/>
          </circle>
          <circle cx="650" cy="200" r="100" fill="url(#cc_g2)" filter="url(#cc_blur)">
            <animate attributeName="cx" values="650;620;650" dur="10s" repeatCount="indefinite"/>
          </circle>
          <circle cx="400" cy="150" r="70" fill="url(#cc_g1)" filter="url(#cc_blur)" opacity="0.5">
            <animate attributeName="r" values="70;90;70" dur="7s" repeatCount="indefinite"/>
          </circle>
          {/* Sparkles */}
          {[...Array(20)].map((_, i) => (
            <g key={i} transform={`translate(${Math.random()*800}, ${Math.random()*320})`}>
              <line x1="-4" y1="0" x2="4" y2="0" stroke="white" strokeWidth="1.5" opacity="0.6">
                <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${1.5+Math.random()*2}s`} repeatCount="indefinite"/>
              </line>
              <line x1="0" y1="-4" x2="0" y2="4" stroke="white" strokeWidth="1.5" opacity="0.6">
                <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${1.5+Math.random()*2}s`} repeatCount="indefinite"/>
              </line>
            </g>
          ))}
          {/* Candy stick */}
          <g transform="translate(700, 20) rotate(15)">
            <rect x="-8" y="0" width="16" height="180" rx="8" fill="white" opacity="0.3"/>
            {[...Array(9)].map((_, i) => <rect key={i} x="-8" y={i*20} width="16" height="10" rx="2" fill="#f48fb1" opacity="0.4"/>)}
          </g>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full text-center px-6">
          <div className="px-6 py-1 rounded-full mb-3" style={{ background: "rgba(255,255,255,0.4)", backdropFilter: "blur(10px)" }}>
            <span className="text-pink-600 text-xs font-semibold tracking-widest uppercase">Sweet Collection</span>
          </div>
          <h2 className="text-4xl font-black text-pink-800" style={{ textShadow: "0 2px 10px rgba(244,143,177,0.3)" }}>{title}</h2>
          <p className="text-pink-600/70 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #f48fb1, #ce93d8)", boxShadow: "0 4px 15px rgba(244,143,177,0.4)" }}>Shop Now ✨</button>
        </div>
      </div>
    ),
  },

  // 2. Lollipop Swirl
  {
    id: 2,
    name: "Lollipop Swirl",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #fff5f5 0%, #ffe0e6 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <linearGradient id="lolli1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff6b6b"/><stop offset="100%" stopColor="#ffd93d"/></linearGradient>
            <linearGradient id="lolli2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6c5ce7"/><stop offset="100%" stopColor="#a29bfe"/></linearGradient>
          </defs>
          {/* Lollipop 1 */}
          <g transform="translate(120, 160)">
            <rect x="-4" y="50" width="8" height="120" rx="4" fill="#ddd" opacity="0.5"/>
            <circle r="50" fill="none" stroke="url(#lolli1)" strokeWidth="20" strokeDasharray="15 15" opacity="0.4">
              <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="12s" repeatCount="indefinite"/>
            </circle>
            <circle r="20" fill="#ff6b6b" opacity="0.3"/>
          </g>
          {/* Lollipop 2 */}
          <g transform="translate(680, 140)">
            <rect x="-4" y="40" width="8" height="130" rx="4" fill="#ddd" opacity="0.4"/>
            <circle r="40" fill="none" stroke="url(#lolli2)" strokeWidth="16" strokeDasharray="12 12" opacity="0.35">
              <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="10s" repeatCount="indefinite"/>
            </circle>
            <circle r="15" fill="#6c5ce7" opacity="0.3"/>
          </g>
          {/* Candy dots */}
          {[...Array(25)].map((_, i) => {
            const colors = ["#ff6b6b","#ffd93d","#6c5ce7","#a29bfe","#ff9ff3","#54a0ff"];
            return <circle key={i} cx={200+Math.random()*400} cy={40+Math.random()*240} r={3+Math.random()*5} fill={colors[Math.floor(Math.random()*colors.length)]} opacity={0.2+Math.random()*0.2}>
              <animate attributeName="r" values={`${3+Math.random()*5};${5+Math.random()*5};${3+Math.random()*5}`} dur={`${2+Math.random()*3}s`} repeatCount="indefinite"/>
            </circle>;
          })}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <span className="text-2xl mb-2">🍭</span>
          <h2 className="text-3xl font-black text-red-500">{title}</h2>
          <p className="text-purple-400/70 mt-1 text-sm">{subtitle}</p>
          <div className="flex gap-3 mt-4">
            <button className="px-6 py-2 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #ff6b6b, #ffd93d)" }}>Browse Candy</button>
            <button className="px-6 py-2 rounded-full text-sm font-bold border-2 border-purple-300 text-purple-500">View Deals</button>
          </div>
        </div>
      </div>
    ),
  },

  // 3. Chocolate Drizzle
  {
    id: 3,
    name: "Chocolate Drizzle",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #4a2c2a 0%, #6d4c41 40%, #8d6e63 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <linearGradient id="choc1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3e2723"/><stop offset="100%" stopColor="#5d4037"/></linearGradient>
            <filter id="chocBlur"><feGaussianBlur stdDeviation="3"/></filter>
          </defs>
          {/* Dripping chocolate */}
          {[0,80,160,240,320,400,480,560,640,720,800].map((x, i) => (
            <path key={i} d={`M${x-20},0 L${x+20},0 L${x+15},${30+Math.random()*40} Q${x},${50+Math.random()*60} ${x-15},${30+Math.random()*40}Z`} fill="#3e2723" opacity="0.6">
              <animate attributeName="opacity" values="0.4;0.7;0.4" dur={`${3+Math.random()*2}s`} repeatCount="indefinite"/>
            </path>
          ))}
          {/* Gold sprinkles */}
          {[...Array(30)].map((_, i) => (
            <rect key={i} x={Math.random()*800} y={80+Math.random()*200} width={2+Math.random()*3} height={8+Math.random()*6} rx="1" fill="#ffd700" opacity={0.3+Math.random()*0.3} transform={`rotate(${Math.random()*360} ${Math.random()*800} ${Math.random()*320})`}>
              <animate attributeName="opacity" values={`${0.2+Math.random()*0.2};${0.5+Math.random()*0.3};${0.2+Math.random()*0.2}`} dur={`${2+Math.random()*3}s`} repeatCount="indefinite"/>
            </rect>
          ))}
          {/* Chocolate swirl */}
          <path d="M300,160 Q350,120 400,160 T500,160" fill="none" stroke="#d7ccc8" strokeWidth="3" opacity="0.2" strokeLinecap="round">
            <animate attributeName="d" values="M300,160 Q350,120 400,160 T500,160;M300,165 Q350,125 400,165 T500,155;M300,160 Q350,120 400,160 T500,160" dur="5s" repeatCount="indefinite"/>
          </path>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <span className="text-2xl mb-2">🍫</span>
          <h2 className="text-3xl font-bold text-amber-100" style={{ textShadow: "0 2px 15px rgba(0,0,0,0.4)" }}>{title}</h2>
          <p className="text-amber-200/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, #ffd700, #ff8f00)", color: "#3e2723" }}>Shop Chocolate</button>
        </div>
      </div>
    ),
  },

  // 4. Gummy Bears
  {
    id: 4,
    name: "Gummy Bears",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #fafafa 0%, #f0f9ff 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Gummy bear shapes */}
          {[
            { x: 80, y: 60, color: "#ef4444", scale: 1.2 },
            { x: 200, y: 220, color: "#22c55e", scale: 0.9 },
            { x: 350, y: 40, color: "#eab308", scale: 1 },
            { x: 500, y: 240, color: "#f97316", scale: 1.1 },
            { x: 650, y: 80, color: "#ec4899", scale: 0.8 },
            { x: 730, y: 200, color: "#8b5cf6", scale: 1 },
          ].map((bear, i) => (
            <g key={i} transform={`translate(${bear.x}, ${bear.y}) scale(${bear.scale})`} opacity="0.35">
              <ellipse cx="0" cy="0" rx="18" ry="22" fill={bear.color}/>
              <circle cx="-10" cy="-18" r="7" fill={bear.color}/>
              <circle cx="10" cy="-18" r="7" fill={bear.color}/>
              <ellipse cx="-12" cy="18" rx="6" ry="8" fill={bear.color}/>
              <ellipse cx="12" cy="18" rx="6" ry="8" fill={bear.color}/>
              <circle cx="-5" cy="-5" r="2" fill="white" opacity="0.5"/>
              <circle cx="5" cy="-5" r="2" fill="white" opacity="0.5"/>
              <animate attributeName="opacity" values="0.3;0.45;0.3" dur={`${3+i*0.5}s`} repeatCount="indefinite"/>
            </g>
          ))}
          {/* Bouncing dots */}
          {[...Array(15)].map((_, i) => {
            const colors = ["#ef4444","#22c55e","#eab308","#f97316","#ec4899"];
            return <circle key={i} cx={Math.random()*800} cy={Math.random()*320} r={2+Math.random()*3} fill={colors[i%5]} opacity="0.15"/>;
          })}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-black" style={{ background: "linear-gradient(90deg, #ef4444, #eab308, #22c55e, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{title}</h2>
          <p className="text-gray-400 mt-2 text-sm">{subtitle}</p>
          <div className="flex gap-2 mt-4">
            {["🔴","🟢","🟡","🟠","🟣"].map((e,i) => <span key={i} className="text-lg" style={{ animation: `bounce ${1+i*0.2}s infinite` }}>{e}</span>)}
          </div>
        </div>
      </div>
    ),
  },

  // 5. Candy Cane Lane
  {
    id: 5,
    name: "Candy Cane Lane",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "#fef2f2" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Diagonal candy stripes */}
          {[...Array(20)].map((_, i) => (
            <rect key={i} x={i * 50 - 50} y="-50" width="20" height="500" fill={i % 2 === 0 ? "#fca5a5" : "white"} opacity="0.15" transform="rotate(-25 400 160)"/>
          ))}
          {/* Candy canes */}
          <g transform="translate(100, 30)" opacity="0.3">
            <path d="M0,100 L0,30 Q0,0 20,0 Q40,0 40,20" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round"/>
            <path d="M0,100 L0,30 Q0,0 20,0 Q40,0 40,20" fill="none" stroke="white" strokeWidth="12" strokeLinecap="round" strokeDasharray="12 12"/>
          </g>
          <g transform="translate(680, 40) scale(-1,1)" opacity="0.25">
            <path d="M0,90 L0,25 Q0,0 18,0 Q36,0 36,18" fill="none" stroke="#ef4444" strokeWidth="10" strokeLinecap="round"/>
            <path d="M0,90 L0,25 Q0,0 18,0 Q36,0 36,18" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeDasharray="10 10"/>
          </g>
          {/* Peppermint circles */}
          {[{x:350,y:50},{x:600,y:250},{x:200,y:260}].map((p,i) => (
            <g key={i} transform={`translate(${p.x},${p.y})`} opacity="0.2">
              <circle r="25" fill="white" stroke="#fca5a5" strokeWidth="2"/>
              {[0,60,120,180,240,300].map((a,j) => <path key={j} d={`M0,0 L${Math.cos(a*Math.PI/180)*25},${Math.sin(a*Math.PI/180)*25}`} stroke="#ef4444" strokeWidth="4"/>)}
              <animateTransform attributeName="transform" type="rotate" from={`0 ${p.x} ${p.y}`} to={`360 ${p.x} ${p.y}`} dur={`${8+i*3}s`} repeatCount="indefinite"/>
            </g>
          ))}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-black text-red-500">{title}</h2>
          <p className="text-red-300/70 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-red-500" style={{ boxShadow: "0 4px 15px rgba(239,68,68,0.3)" }}>Shop Candy Canes 🎄</button>
        </div>
      </div>
    ),
  },

  // 6. Bubblegum Pop
  {
    id: 6,
    name: "Bubblegum Pop",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Bubbles */}
          {[...Array(15)].map((_, i) => {
            const r = 15 + Math.random() * 40;
            const x = Math.random() * 800;
            const y = Math.random() * 320;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={r} fill="none" stroke="#f9a8d4" strokeWidth="1.5" opacity={0.2 + Math.random() * 0.2}>
                  <animate attributeName="r" values={`${r};${r + 5};${r}`} dur={`${3 + Math.random() * 3}s`} repeatCount="indefinite"/>
                  <animate attributeName="cy" values={`${y};${y - 10};${y}`} dur={`${4 + Math.random() * 3}s`} repeatCount="indefinite"/>
                </circle>
                <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.15} fill="white" opacity="0.3"/>
              </g>
            );
          })}
          {/* Pop burst */}
          <g transform="translate(650, 80)" opacity="0.3">
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45) * Math.PI / 180;
              return <line key={i} x1={Math.cos(angle)*15} y1={Math.sin(angle)*15} x2={Math.cos(angle)*30} y2={Math.sin(angle)*30} stroke="#ec4899" strokeWidth="2" strokeLinecap="round">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite"/>
              </line>;
            })}
          </g>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-4xl font-black text-pink-500" style={{ textShadow: "2px 2px 0 #fbcfe8" }}>{title}</h2>
          <p className="text-pink-400/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-pink-500">Pop & Shop 🫧</button>
        </div>
      </div>
    ),
  },

  // 7. Jawbreaker Layers
  {
    id: 7,
    name: "Jawbreaker Layers",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Giant jawbreaker */}
          <g transform="translate(620, 160)">
            {[
              { r: 100, color: "#ef4444" },
              { r: 85, color: "#f97316" },
              { r: 70, color: "#eab308" },
              { r: 55, color: "#22c55e" },
              { r: 40, color: "#3b82f6" },
              { r: 25, color: "#8b5cf6" },
              { r: 12, color: "#ec4899" },
            ].map((layer, i) => (
              <circle key={i} r={layer.r} fill={layer.color} opacity={0.3 + i * 0.03}>
                <animate attributeName="r" values={`${layer.r};${layer.r + 3};${layer.r}`} dur={`${4 + i * 0.5}s`} repeatCount="indefinite"/>
              </circle>
            ))}
          </g>
          {/* Small jawbreakers */}
          {[{x:100,y:80,s:0.3},{x:150,y:250,s:0.25},{x:300,y:60,s:0.2}].map((j,idx) => (
            <g key={idx} transform={`translate(${j.x},${j.y}) scale(${j.s})`} opacity="0.5">
              <circle r="60" fill="#ef4444"/><circle r="45" fill="#eab308"/><circle r="30" fill="#22c55e"/><circle r="15" fill="#3b82f6"/>
            </g>
          ))}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-start h-full pl-12">
          <h2 className="text-3xl font-black text-white">{title}</h2>
          <p className="text-indigo-300/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-indigo-900" style={{ background: "linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6, #8b5cf6)" }}>Explore Flavors</button>
        </div>
      </div>
    ),
  },

  // 8. Sugar Crystals
  {
    id: 8,
    name: "Sugar Crystals",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Crystal shapes */}
          {[...Array(12)].map((_, i) => {
            const x = 50 + Math.random() * 700;
            const y = 20 + Math.random() * 280;
            const size = 10 + Math.random() * 25;
            const colors = ["#fbbf24","#f59e0b","#d97706","#fcd34d","#fef3c7"];
            return (
              <polygon key={i} points={`${x},${y-size} ${x+size*0.6},${y-size*0.3} ${x+size*0.4},${y+size*0.5} ${x-size*0.4},${y+size*0.5} ${x-size*0.6},${y-size*0.3}`} fill={colors[i%5]} opacity={0.2+Math.random()*0.2} stroke={colors[i%5]} strokeWidth="0.5">
                <animate attributeName="opacity" values={`${0.15+Math.random()*0.15};${0.3+Math.random()*0.2};${0.15+Math.random()*0.15}`} dur={`${3+Math.random()*3}s`} repeatCount="indefinite"/>
                <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`${Math.random()>0.5?360:-360} ${x} ${y}`} dur={`${15+Math.random()*10}s`} repeatCount="indefinite"/>
              </polygon>
            );
          })}
          {/* Shimmer lines */}
          {[...Array(8)].map((_, i) => <line key={i} x1={Math.random()*800} y1={Math.random()*320} x2={Math.random()*800} y2={Math.random()*320} stroke="#fbbf24" strokeWidth="0.5" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur={`${2+Math.random()*2}s`} repeatCount="indefinite"/>
          </line>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-bold text-amber-800" style={{ textShadow: "0 1px 2px rgba(251,191,36,0.3)" }}>{title}</h2>
          <p className="text-amber-600/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold bg-amber-500 text-white">Sweet Deals ✨</button>
        </div>
      </div>
    ),
  },

  // 9. Candy Store Neon
  {
    id: 9,
    name: "Candy Store Neon",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "#0f0f1a" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <filter id="candyNeon"><feGaussianBlur stdDeviation="4"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          {/* Neon candy text outline */}
          <text x="400" y="80" textAnchor="middle" fontSize="16" fill="none" stroke="#ff6b9d" strokeWidth="1" filter="url(#candyNeon)" opacity="0.5" fontFamily="monospace">CANDY SHOP</text>
          {/* Neon shapes */}
          <rect x="60" y="100" width="120" height="80" rx="10" fill="none" stroke="#00ffff" strokeWidth="2" filter="url(#candyNeon)" opacity="0.4">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite"/>
          </rect>
          <circle cx="700" cy="140" r="50" fill="none" stroke="#ff6b9d" strokeWidth="2" filter="url(#candyNeon)" opacity="0.35">
            <animate attributeName="opacity" values="0.2;0.5;0.2" dur="4s" repeatCount="indefinite"/>
          </circle>
          {/* Neon candy cane */}
          <path d="M350,220 L350,270 Q350,290 370,290 Q390,290 390,270" fill="none" stroke="#ff6b9d" strokeWidth="3" filter="url(#candyNeon)" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite"/>
          </path>
          {/* Stars */}
          {[...Array(10)].map((_, i) => (
            <circle key={i} cx={Math.random()*800} cy={Math.random()*320} r="1" fill={["#ff6b9d","#00ffff","#ffd93d"][i%3]}>
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur={`${1+Math.random()*2}s`} repeatCount="indefinite"/>
            </circle>
          ))}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-bold" style={{ color: "#ff6b9d", textShadow: "0 0 20px #ff6b9d, 0 0 40px #ff6b9d" }}>{title}</h2>
          <p className="mt-2 text-sm" style={{ color: "#00ffff", textShadow: "0 0 10px #00ffff" }}>{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold" style={{ border: "2px solid #ff6b9d", color: "#ff6b9d", textShadow: "0 0 10px #ff6b9d" }}>Enter Store ✦</button>
        </div>
      </div>
    ),
  },

  // 10. Sprinkle Party
  {
    id: 10,
    name: "Sprinkle Party",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #fef9c3 0%, #fde68a 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Sprinkles */}
          {[...Array(60)].map((_, i) => {
            const x = Math.random() * 800;
            const y = Math.random() * 320;
            const angle = Math.random() * 360;
            const colors = ["#ef4444","#3b82f6","#22c55e","#f97316","#8b5cf6","#ec4899","#eab308","#06b6d4"];
            return <rect key={i} x={x} y={y} width={3} height={12} rx="1.5" fill={colors[Math.floor(Math.random()*colors.length)]} opacity={0.4+Math.random()*0.3} transform={`rotate(${angle} ${x+1.5} ${y+6})`}/>;
          })}
          {/* Donut shape */}
          <g transform="translate(650, 160)" opacity="0.2">
            <circle r="50" fill="#f9a8d4"/>
            <circle r="20" fill="#fef9c3"/>
          </g>
          <g transform="translate(130, 100)" opacity="0.15">
            <circle r="35" fill="#c4b5fd"/>
            <circle r="14" fill="#fef9c3"/>
          </g>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-black text-orange-600">{title}</h2>
          <p className="text-orange-400/70 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316, #eab308)" }}>Party Mix 🎉</button>
        </div>
      </div>
    ),
  },

  // 11. Ice Cream Drip
  {
    id: 11,
    name: "Ice Cream Drip",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #fdf2f8 0%, #ede9fe 50%, #dbeafe 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Ice cream drips from top */}
          {[40,120,200,280,360,440,520,600,680,760].map((x, i) => {
            const colors = ["#f9a8d4","#c4b5fd","#93c5fd","#f9a8d4","#c4b5fd","#93c5fd","#f9a8d4","#c4b5fd","#93c5fd","#f9a8d4"];
            const h = 30 + Math.random() * 60;
            return (
              <g key={i}>
                <rect x={x-20} y="0" width="40" height={h} fill={colors[i]} opacity="0.4"/>
                <ellipse cx={x} cy={h} rx="20" ry="15" fill={colors[i]} opacity="0.4">
                  <animate attributeName="ry" values="15;20;15" dur={`${3+Math.random()*2}s`} repeatCount="indefinite"/>
                </ellipse>
              </g>
            );
          })}
          {/* Waffle cone pattern */}
          <g transform="translate(650, 200)" opacity="0.15">
            <polygon points="0,-40 30,60 -30,60" fill="#d97706" stroke="#b45309" strokeWidth="1"/>
            {[...Array(4)].map((_, i) => <line key={i} x1={-20+i*12} y1={-20+i*15} x2={20-i*3} y2={40-i*5} stroke="#b45309" strokeWidth="0.5" opacity="0.5"/>)}
          </g>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full" style={{ paddingTop: "40px" }}>
          <h2 className="text-3xl font-black text-purple-600">{title}</h2>
          <p className="text-pink-400/70 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #f9a8d4, #c4b5fd, #93c5fd)" }}>Get Scoops 🍦</button>
        </div>
      </div>
    ),
  },

  // 12. Candy Galaxy
  {
    id: 12,
    name: "Candy Galaxy",
    category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "radial-gradient(ellipse at 50% 50%, #2d1b69 0%, #0f0f2d 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <filter id="cg_glow"><feGaussianBlur stdDeviation="6"/></filter>
          </defs>
          {/* Spiral candy galaxy */}
          {[...Array(4)].map((_, arm) => (
            <g key={arm}>
              {[...Array(15)].map((_, i) => {
                const angle = (arm * 90 + i * 20) * Math.PI / 180;
                const r = 20 + i * 12;
                const x = 400 + Math.cos(angle) * r;
                const y = 160 + Math.sin(angle) * r * 0.6;
                const colors = ["#ff6b9d","#ffd93d","#6c5ce7","#00d2d3","#ff9ff3"];
                return <circle key={i} cx={x} cy={y} r={3 + Math.random() * 4} fill={colors[(arm+i)%5]} opacity={0.4 - i * 0.02} filter="url(#cg_glow)"/>;
              })}
            </g>
          ))}
          {/* Center glow */}
          <circle cx="400" cy="160" r="30" fill="#ff6b9d" opacity="0.15" filter="url(#cg_glow)"/>
          {/* Tiny stars */}
          {[...Array(30)].map((_, i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*320} r={Math.random()*1.5} fill="white" opacity={Math.random()*0.4}>
            <animate attributeName="opacity" values={`${Math.random()*0.2};${0.3+Math.random()*0.4};${Math.random()*0.2}`} dur={`${1+Math.random()*3}s`} repeatCount="indefinite"/>
          </circle>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-bold text-pink-200" style={{ textShadow: "0 0 20px rgba(255,107,157,0.4)" }}>{title}</h2>
          <p className="text-purple-300/50 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, #ff6b9d, #6c5ce7)", color: "white" }}>Explore Universe 🌌</button>
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════════
  // 🛒 E-COMMERCE THEMES (13-24)
  // ═══════════════════════════════════════════

  // 13. Flash Sale Fire
  {
    id: 13,
    name: "Flash Sale Fire",
    category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #1a0000 0%, #4a0000 50%, #8b0000 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <linearGradient id="fire1" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#ff4500"/><stop offset="50%" stopColor="#ff8c00"/><stop offset="100%" stopColor="#ffd700"/></linearGradient>
            <filter id="fireGlow"><feGaussianBlur stdDeviation="8"/></filter>
          </defs>
          {/* Fire flames */}
          {[100,250,400,550,700].map((x, i) => (
            <path key={i} d={`M${x},320 Q${x-20},${250-i*10} ${x+10},${200-i*5} Q${x+30},${150-i*8} ${x},${120-i*10} Q${x-30},${160-i*5} ${x-15},${220-i*3} Q${x-25},${280} ${x},320`} fill="url(#fire1)" opacity={0.15+i*0.02} filter="url(#fireGlow)">
              <animate attributeName="d" values={`M${x},320 Q${x-20},250 ${x+10},200 Q${x+30},150 ${x},120 Q${x-30},160 ${x-15},220 Q${x-25},280 ${x},320;M${x},320 Q${x-15},240 ${x+15},190 Q${x+20},140 ${x+5},110 Q${x-25},150 ${x-10},210 Q${x-20},275 ${x},320;M${x},320 Q${x-20},250 ${x+10},200 Q${x+30},150 ${x},120 Q${x-30},160 ${x-15},220 Q${x-25},280 ${x},320`} dur={`${3+Math.random()*2}s`} repeatCount="indefinite"/>
            </path>
          ))}
          {/* Sparks */}
          {[...Array(15)].map((_, i) => <circle key={i} cx={100+Math.random()*600} cy={200+Math.random()*100} r="1.5" fill="#ffd700" opacity="0.5">
            <animate attributeName="cy" values={`${200+Math.random()*100};${50+Math.random()*100};${200+Math.random()*100}`} dur={`${2+Math.random()*2}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.5;0;0.5" dur={`${2+Math.random()*2}s`} repeatCount="indefinite"/>
          </circle>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <div className="px-4 py-1 rounded-full mb-3" style={{ background: "rgba(255,69,0,0.3)", border: "1px solid rgba(255,69,0,0.5)" }}>
            <span className="text-orange-300 text-xs font-bold tracking-widest">⚡ LIMITED TIME</span>
          </div>
          <h2 className="text-4xl font-black text-white">{title}</h2>
          <p className="text-orange-200/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-10 py-3 rounded-full text-sm font-black text-black" style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", boxShadow: "0 4px 20px rgba(255,140,0,0.4)" }}>SHOP NOW 🔥</button>
        </div>
      </div>
    ),
  },

  // 14. Luxury Gold
  {
    id: 14,
    name: "Luxury Gold",
    category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <linearGradient id="luxGold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#bf953f"/><stop offset="25%" stopColor="#fcf6ba"/><stop offset="50%" stopColor="#b38728"/><stop offset="75%" stopColor="#fbf5b7"/><stop offset="100%" stopColor="#aa771c"/></linearGradient>
          </defs>
          {/* Gold frame */}
          <rect x="40" y="30" width="720" height="260" fill="none" stroke="url(#luxGold)" strokeWidth="1" opacity="0.3" rx="8"/>
          <rect x="50" y="40" width="700" height="240" fill="none" stroke="url(#luxGold)" strokeWidth="0.5" opacity="0.2" rx="6"/>
          {/* Corner ornaments */}
          {[[60,50],[740,50],[60,260],[740,260]].map(([x,y],i) => (
            <g key={i} transform={`translate(${x},${y})`}>
              <circle r="8" fill="none" stroke="url(#luxGold)" strokeWidth="1" opacity="0.4"/>
              <circle r="3" fill="url(#luxGold)" opacity="0.3"/>
            </g>
          ))}
          {/* Diamond pattern */}
          {[...Array(6)].map((_, i) => <line key={i} x1={100+i*120} y1="50" x2={100+i*120} y2="270" stroke="url(#luxGold)" strokeWidth="0.3" opacity="0.08"/>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-bold" style={{ background: "linear-gradient(135deg, #bf953f, #fcf6ba, #b38728)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "6px" }}>{title}</h2>
          <p className="text-amber-200/40 mt-3 text-sm tracking-widest">{subtitle}</p>
          <button className="mt-5 px-10 py-2.5 text-sm font-medium tracking-widest" style={{ border: "1px solid #bf953f", color: "#bf953f", background: "transparent" }}>DISCOVER</button>
        </div>
      </div>
    ),
  },

  // 15. Fresh & Organic
  {
    id: 15,
    name: "Fresh & Organic",
    category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Leaves */}
          {[{x:100,y:60,r:-20},{x:680,y:80,r:30},{x:150,y:240,r:45},{x:600,y:250,r:-35},{x:400,y:30,r:15}].map((l,i) => (
            <g key={i} transform={`translate(${l.x},${l.y}) rotate(${l.r})`} opacity="0.25">
              <path d="M0,0 Q15,-20 0,-40 Q-15,-20 0,0" fill="#22c55e"/>
              <line x1="0" y1="0" x2="0" y2="-35" stroke="#16a34a" strokeWidth="0.5"/>
              <animate attributeName="opacity" values="0.2;0.35;0.2" dur={`${4+i}s`} repeatCount="indefinite"/>
            </g>
          ))}
          {/* Organic circles */}
          <circle cx="400" cy="160" r="120" fill="none" stroke="#86efac" strokeWidth="1" opacity="0.15" strokeDasharray="8 8">
            <animateTransform attributeName="transform" type="rotate" from="0 400 160" to="360 400 160" dur="30s" repeatCount="indefinite"/>
          </circle>
          <circle cx="400" cy="160" r="90" fill="none" stroke="#4ade80" strokeWidth="0.5" opacity="0.1" strokeDasharray="5 10">
            <animateTransform attributeName="transform" type="rotate" from="360 400 160" to="0 400 160" dur="20s" repeatCount="indefinite"/>
          </circle>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <span className="text-green-600 text-xs font-semibold tracking-widest uppercase mb-2">🌿 100% Natural</span>
          <h2 className="text-3xl font-bold text-green-800">{title}</h2>
          <p className="text-green-600/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-green-600">Shop Fresh 🥬</button>
        </div>
      </div>
    ),
  },

  // 16. Mega Discount
  {
    id: 16,
    name: "Mega Discount",
    category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #2563eb 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Percentage signs floating */}
          {[{x:80,y:60,s:40},{x:700,y:80,s:50},{x:150,y:250,s:30},{x:620,y:240,s:35},{x:350,y:50,s:25},{x:500,y:260,s:45}].map((p,i) => (
            <text key={i} x={p.x} y={p.y} fontSize={p.s} fill="white" opacity="0.08" fontWeight="bold">%
              <animate attributeName="opacity" values="0.05;0.15;0.05" dur={`${3+i}s`} repeatCount="indefinite"/>
            </text>
          ))}
          {/* Starburst */}
          <g transform="translate(400, 160)">
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30) * Math.PI / 180;
              return <line key={i} x1={Math.cos(angle)*60} y1={Math.sin(angle)*60} x2={Math.cos(angle)*200} y2={Math.sin(angle)*200} stroke="white" strokeWidth="0.5" opacity="0.06"/>;
            })}
          </g>
          {/* Price tag shape */}
          <g transform="translate(650, 60)" opacity="0.15">
            <rect x="0" y="0" width="80" height="50" rx="5" fill="white"/>
            <circle cx="15" cy="15" r="5" fill="#4f46e5"/>
          </g>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-6xl font-black text-white" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>70%</span>
            <span className="text-xl font-bold text-yellow-300">OFF</span>
          </div>
          <h2 className="text-2xl font-bold text-white/90">{title}</h2>
          <p className="text-blue-200/60 mt-1 text-sm">{subtitle}</p>
          <button className="mt-4 px-10 py-3 rounded-full text-sm font-black bg-yellow-400 text-purple-900">GRAB DEAL ⚡</button>
        </div>
      </div>
    ),
  },

  // 17. Fashion Runway
  {
    id: 17,
    name: "Fashion Runway",
    category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "#0a0a0a" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <linearGradient id="runway" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="transparent"/><stop offset="50%" stopColor="white" stopOpacity="0.05"/><stop offset="100%" stopColor="transparent"/></linearGradient>
          </defs>
          {/* Runway perspective lines */}
          <line x1="400" y1="0" x2="200" y2="320" stroke="white" strokeWidth="0.5" opacity="0.1"/>
          <line x1="400" y1="0" x2="600" y2="320" stroke="white" strokeWidth="0.5" opacity="0.1"/>
          <line x1="400" y1="0" x2="300" y2="320" stroke="white" strokeWidth="0.3" opacity="0.06"/>
          <line x1="400" y1="0" x2="500" y2="320" stroke="white" strokeWidth="0.3" opacity="0.06"/>
          {/* Horizontal lines */}
          {[80,130,180,230,280].map((y, i) => <line key={i} x1={350-i*20} y1={y} x2={450+i*20} y2={y} stroke="white" strokeWidth="0.3" opacity={0.04+i*0.01}/>)}
          {/* Spotlight effect */}
          <ellipse cx="400" cy="300" rx="150" ry="20" fill="url(#runway)"/>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <span className="text-white/30 text-xs tracking-[8px] uppercase mb-3">New Season</span>
          <h2 className="text-4xl font-thin text-white tracking-[4px]">{title}</h2>
          <p className="text-gray-500 mt-3 text-sm tracking-widest">{subtitle}</p>
          <button className="mt-5 px-10 py-2 text-xs font-medium tracking-[4px] text-white border border-white/20 hover:border-white/50 transition-all">EXPLORE</button>
        </div>
      </div>
    ),
  },

  // 18. Tech Gadgets
  {
    id: 18,
    name: "Tech Gadgets",
    category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <linearGradient id="techGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#38bdf8"/><stop offset="100%" stopColor="#818cf8"/></linearGradient>
          </defs>
          {/* Circuit lines */}
          {[...Array(8)].map((_, i) => {
            const y = 20 + i * 40;
            return <path key={i} d={`M0,${y} L${100+Math.random()*100},${y} L${150+Math.random()*50},${y+20} L${300+Math.random()*200},${y+20}`} fill="none" stroke="url(#techGrad)" strokeWidth="1" opacity="0.1"/>;
          })}
          {/* Dots at intersections */}
          {[...Array(12)].map((_, i) => <circle key={i} cx={50+Math.random()*700} cy={30+Math.random()*260} r="2" fill="#38bdf8" opacity="0.2">
            <animate attributeName="opacity" values="0.1;0.4;0.1" dur={`${2+Math.random()*3}s`} repeatCount="indefinite"/>
          </circle>)}
          {/* Device outline */}
          <rect x="580" y="60" width="140" height="200" rx="15" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.1"/>
          <rect x="590" y="75" width="120" height="160" rx="5" fill="#38bdf8" opacity="0.03"/>
          <circle cx="650" cy="250" r="5" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.15"/>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-start h-full pl-12">
          <span className="text-sky-400/60 text-xs tracking-widest uppercase mb-2">Latest Tech</span>
          <h2 className="text-3xl font-bold text-white">{title}</h2>
          <p className="text-slate-400 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #38bdf8, #818cf8)" }}>Shop Tech →</button>
        </div>
      </div>
    ),
  },

  // 19. Free Shipping Wave
  {
    id: 19,
    name: "Free Shipping Wave",
    category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Waves */}
          <path d="M0,240 Q100,200 200,240 T400,230 T600,245 T800,220 L800,320 L0,320Z" fill="#6ee7b7" opacity="0.3">
            <animate attributeName="d" values="M0,240 Q100,200 200,240 T400,230 T600,245 T800,220 L800,320 L0,320Z;M0,230 Q100,250 200,220 T400,245 T600,215 T800,240 L800,320 L0,320Z;M0,240 Q100,200 200,240 T400,230 T600,245 T800,220 L800,320 L0,320Z" dur="6s" repeatCount="indefinite"/>
          </path>
          <path d="M0,260 Q150,230 300,260 T600,250 T800,260 L800,320 L0,320Z" fill="#34d399" opacity="0.2">
            <animate attributeName="d" values="M0,260 Q150,230 300,260 T600,250 T800,260 L800,320 L0,320Z;M0,255 Q150,270 300,245 T600,265 T800,250 L800,320 L0,320Z;M0,260 Q150,230 300,260 T600,250 T800,260 L800,320 L0,320Z" dur="8s" repeatCount="indefinite"/>
          </path>
          {/* Package box */}
          <g transform="translate(620, 100)" opacity="0.2">
            <rect x="-25" y="-20" width="50" height="40" rx="3" fill="#059669" stroke="#047857" strokeWidth="1"/>
            <line x1="-25" y1="-5" x2="25" y2="-5" stroke="#047857" strokeWidth="0.5"/>
            <line x1="0" y1="-20" x2="0" y2="20" stroke="#047857" strokeWidth="0.5"/>
          </g>
          {/* Truck */}
          <g transform="translate(180, 130)" opacity="0.15">
            <rect x="0" y="0" width="60" height="35" rx="3" fill="#059669"/>
            <rect x="60" y="10" width="25" height="25" rx="2" fill="#10b981"/>
            <circle cx="15" cy="40" r="7" fill="#047857"/><circle cx="50" cy="40" r="7" fill="#047857"/>
          </g>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full" style={{ paddingBottom: "30px" }}>
          <div className="px-4 py-1 rounded-full mb-3 bg-green-100 border border-green-300">
            <span className="text-green-700 text-xs font-bold">🚚 FREE SHIPPING</span>
          </div>
          <h2 className="text-3xl font-bold text-green-800">{title}</h2>
          <p className="text-green-600/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-green-600">Order Now</button>
        </div>
      </div>
    ),
  },

  // 20. Seasonal Sale
  {
    id: 20,
    name: "Seasonal Sale",
    category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 30%, #fbbf24 60%, #f59e0b 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Sun rays */}
          <g transform="translate(650, 80)">
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30) * Math.PI / 180;
              return <line key={i} x1="0" y1="0" x2={Math.cos(angle)*200} y2={Math.sin(angle)*200} stroke="#f59e0b" strokeWidth="2" opacity="0.1">
                <animate attributeName="opacity" values="0.05;0.15;0.05" dur={`${3+i*0.3}s`} repeatCount="indefinite"/>
              </line>;
            })}
            <circle r="40" fill="#fbbf24" opacity="0.3"/>
            <circle r="25" fill="#fde68a" opacity="0.2"/>
          </g>
          {/* Confetti */}
          {[...Array(20)].map((_, i) => {
            const shapes = ["rect", "circle"];
            const colors = ["#ef4444","#3b82f6","#22c55e","#8b5cf6","#ec4899"];
            const x = Math.random() * 600;
            if (shapes[i%2] === "rect") {
              return <rect key={i} x={x} y={Math.random()*320} width={4+Math.random()*6} height={4+Math.random()*6} fill={colors[i%5]} opacity={0.15+Math.random()*0.15} transform={`rotate(${Math.random()*360} ${x} ${Math.random()*320})`}/>;
            }
            return <circle key={i} cx={x} cy={Math.random()*320} r={2+Math.random()*3} fill={colors[i%5]} opacity={0.15+Math.random()*0.15}/>;
          })}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-start h-full pl-12">
          <div className="px-3 py-1 rounded bg-white/40 mb-2"><span className="text-amber-800 text-xs font-bold">☀️ SUMMER COLLECTION</span></div>
          <h2 className="text-4xl font-black text-amber-900">{title}</h2>
          <p className="text-amber-700/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-amber-700" style={{ boxShadow: "0 4px 15px rgba(180,83,9,0.3)" }}>Shop Collection</button>
        </div>
      </div>
    ),
  },

  // ═══════════════════════════════════════════
  // 🎨 ABSTRACT & ADVANCED THEMES (21-40)
  // ═══════════════════════════════════════════

  // 21. Aurora Borealis
  {
    id: 21,
    name: "Aurora Borealis",
    category: "Nature",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 40%, #0d3b66 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="aurora1x" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff87" stopOpacity="0.6"><animate attributeName="stop-color" values="#00ff87;#60efff;#ff6b9d;#00ff87" dur="8s" repeatCount="indefinite"/></stop>
              <stop offset="50%" stopColor="#60efff" stopOpacity="0.4"><animate attributeName="stop-color" values="#60efff;#ff6b9d;#00ff87;#60efff" dur="8s" repeatCount="indefinite"/></stop>
              <stop offset="100%" stopColor="#ff6b9d" stopOpacity="0.6"><animate attributeName="stop-color" values="#ff6b9d;#00ff87;#60efff;#ff6b9d" dur="8s" repeatCount="indefinite"/></stop>
            </linearGradient>
            <filter id="auroraBlurx"><feGaussianBlur stdDeviation="20"/></filter>
          </defs>
          <path d="M0,150 Q100,50 200,120 T400,80 T600,130 T800,90" fill="none" stroke="url(#aurora1x)" strokeWidth="60" filter="url(#auroraBlurx)" opacity="0.7">
            <animate attributeName="d" values="M0,150 Q100,50 200,120 T400,80 T600,130 T800,90;M0,120 Q100,80 200,60 T400,140 T600,70 T800,120;M0,150 Q100,50 200,120 T400,80 T600,130 T800,90" dur="10s" repeatCount="indefinite"/>
          </path>
          {[...Array(30)].map((_, i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*320} r={Math.random()*2} fill="white" opacity={Math.random()*0.8}><animate attributeName="opacity" values={`${Math.random()*0.3};${Math.random()*0.8+0.2};${Math.random()*0.3}`} dur={`${2+Math.random()*3}s`} repeatCount="indefinite"/></circle>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-white" style={{ textShadow: "0 0 30px rgba(0,255,135,0.5)" }}>{title}</h2><p className="text-green-200/80 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 22. Neon Cyberpunk
  {
    id: 22, name: "Neon Cyberpunk", category: "Tech",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0f0f23 0%, #1a0a2e 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs><filter id="neonGlowx"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          {[...Array(15)].map((_, i) => <line key={i} x1={i * 55} y1="0" x2={i * 55} y2="320" stroke="#00ffff" strokeWidth="0.5" opacity="0.12"/>)}
          {[...Array(8)].map((_, i) => <line key={i} x1="0" y1={i * 42} x2="800" y2={i * 42} stroke="#00ffff" strokeWidth="0.5" opacity="0.12"/>)}
          <rect x="50" y="30" width="200" height="80" fill="none" stroke="#ff00ff" strokeWidth="2" filter="url(#neonGlowx)" opacity="0.5" rx="4"><animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite"/></rect>
          <rect x="580" y="200" width="150" height="60" fill="none" stroke="#00ffff" strokeWidth="2" filter="url(#neonGlowx)" opacity="0.4" rx="4"><animate attributeName="opacity" values="0.5;0.2;0.5" dur="4s" repeatCount="indefinite"/></rect>
          <line x1="0" y1="280" x2="800" y2="280" stroke="#ff00ff" strokeWidth="3" filter="url(#neonGlowx)"><animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/></line>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold" style={{ color: "#00ffff", textShadow: "0 0 20px #00ffff, 0 0 40px #00ffff" }}>{title}</h2><p className="mt-2 text-sm" style={{ color: "#ff00ff", textShadow: "0 0 10px #ff00ff" }}>{subtitle}</p></div>
      </div>
    ),
  },

  // 23. Ocean Waves
  {
    id: 23, name: "Ocean Depths", category: "Nature",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #0077b6 0%, #023e8a 50%, #03045e 100%)" }}>
        <svg className="absolute bottom-0 w-full" viewBox="0 0 800 200" preserveAspectRatio="none" style={{ height: "55%" }}>
          <path d="M0,100 C150,60 300,140 450,100 C600,60 750,130 800,100 L800,200 L0,200Z" fill="#0096c7" opacity="0.4"><animate attributeName="d" values="M0,100 C150,60 300,140 450,100 C600,60 750,130 800,100 L800,200 L0,200Z;M0,120 C150,140 300,60 450,120 C600,140 750,70 800,120 L800,200 L0,200Z;M0,100 C150,60 300,140 450,100 C600,60 750,130 800,100 L800,200 L0,200Z" dur="6s" repeatCount="indefinite"/></path>
          <path d="M0,130 C200,90 350,160 500,120 C650,80 750,150 800,130 L800,200 L0,200Z" fill="#48cae4" opacity="0.3"><animate attributeName="d" values="M0,130 C200,90 350,160 500,120 C650,80 750,150 800,130 L800,200 L0,200Z;M0,110 C200,150 350,80 500,140 C650,160 750,90 800,110 L800,200 L0,200Z;M0,130 C200,90 350,160 500,120 C650,80 750,150 800,130 L800,200 L0,200Z" dur="8s" repeatCount="indefinite"/></path>
          <path d="M0,160 C100,140 250,180 400,150 C550,120 700,170 800,160 L800,200 L0,200Z" fill="#90e0ef" opacity="0.25"/>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-white drop-shadow-lg">{title}</h2><p className="text-cyan-200/80 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 24. Retro Synthwave
  {
    id: 24, name: "Retro Synthwave", category: "Retro",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #0a0015 0%, #1a0030 40%, #2d1b69 70%, #ff6ec7 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320" preserveAspectRatio="none">
          <defs><linearGradient id="synthSunx" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6ec7"/><stop offset="100%" stopColor="#ff9a3c"/></linearGradient></defs>
          <circle cx="400" cy="220" r="60" fill="url(#synthSunx)"/>
          {[...Array(5)].map((_, i) => <line key={i} x1="340" y1={220 + i * 12} x2="460" y2={220 + i * 12} stroke="#0a0015" strokeWidth="4"/>)}
          {[...Array(15)].map((_, i) => <line key={`h${i}`} x1={i * 58} y1="240" x2={400 + (i * 58 - 400) * 3} y2="320" stroke="#ff6ec7" strokeWidth="1" opacity="0.4"/>)}
          {[...Array(5)].map((_, i) => <line key={`v${i}`} x1="0" y1={240 + i * 16} x2="800" y2={240 + i * 16} stroke="#ff6ec7" strokeWidth="1" opacity={0.4 - i * 0.06}/>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full" style={{ paddingBottom: "80px" }}><h2 className="text-4xl font-bold italic" style={{ color: "#ff6ec7", textShadow: "0 0 20px #ff6ec7, 0 0 40px #ff6ec7" }}>{title}</h2><p className="text-pink-300/70 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 25. Stained Glass
  {
    id: 25, name: "Stained Glass", category: "Creative",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl bg-gray-900">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[
            { points: "0,0 100,0 80,110 0,90", fill: "#ef4444" },{ points: "100,0 250,0 200,100 80,110", fill: "#3b82f6" },
            { points: "250,0 400,0 380,120 200,100", fill: "#10b981" },{ points: "400,0 550,0 500,90 380,120", fill: "#f59e0b" },
            { points: "550,0 700,0 680,110 500,90", fill: "#8b5cf6" },{ points: "700,0 800,0 800,100 680,110", fill: "#ec4899" },
            { points: "0,90 80,110 60,220 0,200", fill: "#06b6d4" },{ points: "80,110 200,100 220,220 60,220", fill: "#f97316" },
            { points: "200,100 380,120 360,230 220,220", fill: "#84cc16" },{ points: "380,120 500,90 520,210 360,230", fill: "#e11d48" },
            { points: "500,90 680,110 660,220 520,210", fill: "#6366f1" },{ points: "680,110 800,100 800,230 660,220", fill: "#14b8a6" },
            { points: "0,200 60,220 40,320 0,320", fill: "#a855f7" },{ points: "60,220 220,220 200,320 40,320", fill: "#22d3ee" },
            { points: "220,220 360,230 340,320 200,320", fill: "#f43f5e" },{ points: "360,230 520,210 540,320 340,320", fill: "#4ade80" },
            { points: "520,210 660,220 680,320 540,320", fill: "#fbbf24" },{ points: "660,220 800,230 800,320 680,320", fill: "#818cf8" },
          ].map((p, i) => <polygon key={i} points={p.points} fill={p.fill} opacity="0.55" stroke="#1a1a2e" strokeWidth="3"><animate attributeName="opacity" values="0.45;0.65;0.45" dur={`${3+i*0.3}s`} repeatCount="indefinite"/></polygon>)}
        </svg>
        <div className="absolute inset-0 bg-black/25"/>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-white drop-shadow-lg">{title}</h2><p className="text-white/70 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 26. Hexagon Matrix
  {
    id: 26, name: "Hexagon Matrix", category: "Tech",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(7)].map((_, row) => [...Array(11)].map((_, col) => {
            const x = col * 80 + (row % 2 ? 40 : 0);
            const y = row * 48;
            const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#c084fc"];
            return <path key={`${row}-${col}`} d="M0,-24 L21,-12 L21,12 L0,24 L-21,12 L-21,-12Z" transform={`translate(${x},${y})`} fill="none" stroke={colors[Math.floor(Math.random()*colors.length)]} strokeWidth="1" opacity={0.12+Math.random()*0.25}>
              <animate attributeName="opacity" values={`${0.08+Math.random()*0.15};${0.25+Math.random()*0.3};${0.08+Math.random()*0.15}`} dur={`${3+Math.random()*4}s`} repeatCount="indefinite"/>
            </path>;
          }))}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-indigo-300">{title}</h2><p className="text-violet-400/60 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 27. Marble Luxury
  {
    id: 27, name: "Marble Luxury", category: "Luxury",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #f5f5f0 0%, #e8e4de 50%, #d4cfc5 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(8)].map((_, i) => <path key={i} d={`M${-50+i*80},${Math.random()*320} Q${200+Math.random()*200},${Math.random()*320} ${500+Math.random()*300},${Math.random()*320}`} fill="none" stroke="#b8a898" strokeWidth={0.5+Math.random()} opacity={0.12+Math.random()*0.12}/>)}
          <rect x="330" y="100" width="140" height="120" fill="none" stroke="#c9a96e" strokeWidth="1" opacity="0.3" rx="2"/>
          <rect x="340" y="110" width="120" height="100" fill="none" stroke="#c9a96e" strokeWidth="0.5" opacity="0.2"/>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold" style={{ color: "#5c4a32", letterSpacing: "6px", fontVariant: "small-caps" }}>{title}</h2><p className="mt-2 text-sm" style={{ color: "#8b7355", letterSpacing: "3px" }}>{subtitle}</p></div>
      </div>
    ),
  },

  // 28. Art Deco Gold
  {
    id: 28, name: "Art Deco Gold", category: "Luxury",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "#1a1a2e" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs><linearGradient id="adGold" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ffd700"/><stop offset="50%" stopColor="#daa520"/><stop offset="100%" stopColor="#b8860b"/></linearGradient></defs>
          <line x1="400" y1="0" x2="400" y2="320" stroke="url(#adGold)" strokeWidth="1" opacity="0.3"/>
          <line x1="0" y1="160" x2="800" y2="160" stroke="url(#adGold)" strokeWidth="1" opacity="0.3"/>
          {[60, 100, 140].map((r, i) => <circle key={i} cx="400" cy="160" r={r} fill="none" stroke="url(#adGold)" strokeWidth="0.5" opacity={0.2 - i * 0.04}/>)}
          {[...Array(8)].map((_, i) => { const a = (i * 45 * Math.PI) / 180; return <line key={i} x1="400" y1="160" x2={400 + Math.cos(a) * 160} y2={160 + Math.sin(a) * 160} stroke="url(#adGold)" strokeWidth="0.5" opacity="0.12"/>; })}
          <polygon points="400,70 420,140 400,120 380,140" fill="url(#adGold)" opacity="0.3"/>
          <polygon points="400,250 420,180 400,200 380,180" fill="url(#adGold)" opacity="0.3"/>
          <rect x="310" y="130" width="180" height="60" fill="none" stroke="url(#adGold)" strokeWidth="1" opacity="0.35" rx="2"/>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold" style={{ color: "#ffd700", letterSpacing: "8px", fontVariant: "small-caps" }}>{title}</h2><p className="mt-2 text-sm" style={{ color: "#daa520", letterSpacing: "4px" }}>{subtitle}</p></div>
      </div>
    ),
  },

  // 29. Cosmic Nebula
  {
    id: 29, name: "Cosmic Nebula", category: "Space",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "radial-gradient(ellipse at 30% 50%, #2d1b69 0%, #0a0a0a 60%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs>
            <radialGradient id="neb1x" cx="30%" cy="50%"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4"/><stop offset="100%" stopColor="transparent"/></radialGradient>
            <radialGradient id="neb2x" cx="70%" cy="40%"><stop offset="0%" stopColor="#ec4899" stopOpacity="0.3"/><stop offset="100%" stopColor="transparent"/></radialGradient>
            <filter id="nebBlurx"><feGaussianBlur stdDeviation="15"/></filter>
          </defs>
          <ellipse cx="250" cy="160" rx="200" ry="100" fill="url(#neb1x)" filter="url(#nebBlurx)"><animate attributeName="rx" values="200;220;200" dur="8s" repeatCount="indefinite"/></ellipse>
          <ellipse cx="550" cy="130" rx="180" ry="90" fill="url(#neb2x)" filter="url(#nebBlurx)"><animate attributeName="ry" values="90;110;90" dur="10s" repeatCount="indefinite"/></ellipse>
          {[...Array(50)].map((_, i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*320} r={Math.random()*1.5+0.5} fill="white" opacity={Math.random()*0.6+0.1}><animate attributeName="opacity" values={`${Math.random()*0.2};${Math.random()*0.7+0.2};${Math.random()*0.2}`} dur={`${1+Math.random()*3}s`} repeatCount="indefinite"/></circle>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-white" style={{ textShadow: "0 0 20px rgba(139,92,246,0.6)" }}>{title}</h2><p className="text-purple-300/70 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 30. Glassmorphism
  {
    id: 30, name: "Glassmorphism", category: "Modern",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <circle cx="200" cy="80" r="100" fill="#ec4899" opacity="0.5"/>
          <circle cx="600" cy="220" r="120" fill="#3b82f6" opacity="0.5"/>
          <circle cx="400" cy="100" r="80" fill="#fbbf24" opacity="0.4"/>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(20px)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.2)", padding: "30px 60px", textAlign: "center" }}>
            <h2 className="text-3xl font-bold text-white">{title}</h2>
            <p className="text-white/70 mt-2 text-sm">{subtitle}</p>
          </div>
        </div>
      </div>
    ),
  },

  // 31. Lightning Storm
  {
    id: 31, name: "Lightning Storm", category: "Nature",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #2d2d44 60%, #3d3d5c 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs><filter id="boltGlowx"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <polyline points="300,0 310,80 280,85 320,160 290,165 330,280" fill="none" stroke="#fbbf24" strokeWidth="3" filter="url(#boltGlowx)"><animate attributeName="opacity" values="0;1;0.8;0;0;0;0.9;0" dur="4s" repeatCount="indefinite"/></polyline>
          <polyline points="550,0 540,60 560,65 530,130 555,135 520,220" fill="none" stroke="#fbbf24" strokeWidth="2" filter="url(#boltGlowx)"><animate attributeName="opacity" values="0;0;0.7;0;0;1;0;0" dur="5s" repeatCount="indefinite"/></polyline>
          <rect x="0" y="0" width="800" height="320" fill="white" opacity="0"><animate attributeName="opacity" values="0;0.12;0;0;0;0;0.08;0" dur="4s" repeatCount="indefinite"/></rect>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-yellow-200" style={{ textShadow: "0 0 15px rgba(251,191,36,0.4)" }}>{title}</h2><p className="text-gray-400 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 32. Cherry Blossom
  {
    id: 32, name: "Cherry Blossom", category: "Nature",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #fce7f3 0%, #fbcfe8 50%, #f9a8d4 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(18)].map((_, i) => {
            const x = Math.random() * 800, startY = -20 - Math.random() * 50;
            return <ellipse key={i} cx={x} cy={startY} rx="6" ry="4" fill="#f9a8d4" opacity={0.3 + Math.random() * 0.3}>
              <animate attributeName="cy" from={startY} to="340" dur={`${6 + Math.random() * 6}s`} repeatCount="indefinite"/>
              <animate attributeName="cx" values={`${x};${x+30};${x-20};${x}`} dur={`${4+Math.random()*3}s`} repeatCount="indefinite"/>
            </ellipse>;
          })}
          <path d="M680,320 L680,140 Q690,120 710,110" fill="none" stroke="#78350f" strokeWidth="3" opacity="0.25"/>
          <path d="M680,200 Q700,190 720,195" fill="none" stroke="#78350f" strokeWidth="2" opacity="0.2"/>
          {[690,710,700,720,680].map((cx,i) => <circle key={i} cx={cx} cy={100+i*15+Math.random()*20} r={4+Math.random()*3} fill="#f472b6" opacity={0.25+Math.random()*0.2}/>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-start h-full pl-12"><h2 className="text-3xl font-bold text-pink-800">{title}</h2><p className="text-pink-600/60 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 33. Diamond Grid
  {
    id: 33, name: "Diamond Grid", category: "Abstract",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(9)].map((_, row) => [...Array(12)].map((_, col) => (
            <rect key={`${row}-${col}`} x={col * 70 + (row % 2 ? 35 : 0)} y={row * 38 - 10} width="28" height="28" fill="none" stroke="#e94560" strokeWidth="1" opacity={0.12 + Math.random() * 0.25} transform={`rotate(45 ${col * 70 + (row % 2 ? 49 : 14)} ${row * 38 + 4})`}>
              <animate attributeName="opacity" values={`${0.08+Math.random()*0.15};${0.3+Math.random()*0.3};${0.08+Math.random()*0.15}`} dur={`${3+Math.random()*4}s`} repeatCount="indefinite"/>
            </rect>
          )))}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-white">{title}</h2><p className="text-red-300/70 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 34. Morphing Blobs
  {
    id: 34, name: "Morphing Blobs", category: "Modern",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "#faf5ff" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs><filter id="blobBlurx"><feGaussianBlur stdDeviation="12"/></filter></defs>
          <ellipse cx="200" cy="110" rx="130" ry="90" fill="#c084fc" opacity="0.3" filter="url(#blobBlurx)"><animate attributeName="rx" values="130;150;120;130" dur="8s" repeatCount="indefinite"/><animate attributeName="ry" values="90;110;80;90" dur="10s" repeatCount="indefinite"/><animate attributeName="cx" values="200;220;180;200" dur="12s" repeatCount="indefinite"/></ellipse>
          <ellipse cx="600" cy="190" rx="110" ry="100" fill="#fb7185" opacity="0.25" filter="url(#blobBlurx)"><animate attributeName="rx" values="110;130;100;110" dur="10s" repeatCount="indefinite"/><animate attributeName="cy" values="190;170;210;190" dur="8s" repeatCount="indefinite"/></ellipse>
          <ellipse cx="400" cy="150" rx="100" ry="80" fill="#60a5fa" opacity="0.2" filter="url(#blobBlurx)"><animate attributeName="ry" values="80;100;70;80" dur="9s" repeatCount="indefinite"/></ellipse>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-purple-800">{title}</h2><p className="text-purple-500/60 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 35. Brutalist
  {
    id: 35, name: "Brutalist", category: "Modern",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "#e5e5e5" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <rect x="50" y="40" width="200" height="130" fill="#1a1a1a" opacity="0.07"/>
          <rect x="550" y="110" width="180" height="170" fill="#1a1a1a" opacity="0.05"/>
          <line x1="0" y1="220" x2="800" y2="220" stroke="#1a1a1a" strokeWidth="4"/>
          <line x1="0" y1="224" x2="800" y2="224" stroke="#1a1a1a" strokeWidth="1"/>
          <rect x="300" y="60" width="3" height="200" fill="#ef4444"/>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-start h-full pl-12"><h2 className="text-4xl font-black text-black" style={{ letterSpacing: "-2px" }}>{title}</h2><p className="text-gray-600 mt-2 text-sm font-mono uppercase tracking-widest">{subtitle}</p></div>
      </div>
    ),
  },

  // 36. Matrix Rain
  {
    id: 36, name: "Matrix Rain", category: "Tech",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl bg-black">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(20)].map((_, i) => (
            <text key={i} x={i * 42} y="0" fill="#00ff41" fontSize="14" fontFamily="monospace" opacity={0.2 + Math.random() * 0.4}>
              {Array.from({length: 20}, () => String.fromCharCode(0x30A0 + Math.random() * 96)).join('\n')}
              <animate attributeName="y" from="-320" to="640" dur={`${3 + Math.random() * 5}s`} repeatCount="indefinite"/>
            </text>
          ))}
        </svg>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black/80"/>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold" style={{ color: "#00ff41", textShadow: "0 0 15px #00ff41" }}>{title}</h2><p className="text-green-400/60 mt-2 text-sm font-mono">{subtitle}</p></div>
      </div>
    ),
  },

  // 37. Snowfall
  {
    id: 37, name: "Snowfall", category: "Nature",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #374151 0%, #6b7280 50%, #d1d5db 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(35)].map((_, i) => {
            const x = Math.random() * 800, size = 2 + Math.random() * 4;
            return <circle key={i} cx={x} cy={-10} r={size} fill="white" opacity={0.3 + Math.random() * 0.5}>
              <animate attributeName="cy" from={-10 - Math.random() * 100} to="340" dur={`${4 + Math.random() * 6}s`} repeatCount="indefinite"/>
              <animate attributeName="cx" values={`${x};${x + 20};${x - 10};${x}`} dur={`${3 + Math.random() * 3}s`} repeatCount="indefinite"/>
            </circle>;
          })}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-white drop-shadow-lg">{title}</h2><p className="text-blue-100/70 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 38. Noise Gradient
  {
    id: 38, name: "Noise Gradient", category: "Modern",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 50%, #ec4899 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          <defs><filter id="noiseFilterx"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs>
          <rect width="800" height="320" filter="url(#noiseFilterx)" opacity="0.08"/>
          {[...Array(5)].map((_, i) => <line key={i} x1={i * 200} y1="0" x2={i * 200 + 50} y2="320" stroke="white" strokeWidth="0.3" opacity="0.08"/>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>{title}</h2><p className="text-white/70 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 39. Topographic
  {
    id: 39, name: "Topographic", category: "Minimal",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "#f8fafc" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(14)].map((_, i) => <path key={i} d={`M${-50+i*10},${160+i*8} Q${200+i*5},${80+i*12} ${400+i*3},${150+i*6} T${800+50-i*10},${140+i*10}`} fill="none" stroke="#94a3b8" strokeWidth="1" opacity={0.12 + i * 0.025}/>)}
          <circle cx="520" cy="140" r="4" fill="#0ea5e9" opacity="0.6"/>
          <circle cx="520" cy="140" r="14" fill="none" stroke="#0ea5e9" strokeWidth="1" opacity="0.3"/>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-start h-full pl-12"><h2 className="text-3xl font-bold text-slate-800">{title}</h2><p className="text-slate-500 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // 40. Holographic
  {
    id: 40, name: "Holographic", category: "Abstract",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(20)].map((_, i) => <line key={i} x1={i * 42} y1="0" x2={i * 42 + 100} y2="320" stroke="white" strokeWidth="0.5" opacity={0.08 + Math.random() * 0.08}/>)}
          {[...Array(10)].map((_, i) => <line key={`h${i}`} x1="0" y1={i * 34} x2="800" y2={i * 34} stroke="white" strokeWidth="0.3" opacity={0.04 + Math.random() * 0.08}/>)}
        </svg>
        <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)" }}/>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-white" style={{ textShadow: "0 0 20px rgba(255,255,255,0.5)" }}>{title}</h2><p className="text-white/70 mt-2 text-sm">{subtitle}</p></div>
      </div>
    ),
  },

  // ═══════════════════════════════════════════
  // 🍬 MORE CANDY THEMES (41-55)
  // ═══════════════════════════════════════════

  // 41. Candy Wrapper Foil
  {
    id: 41, name: "Candy Wrapper Foil", category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 30%, #f43f5e 50%, #f97316 70%, #eab308 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Foil crinkle lines */}
          {[...Array(30)].map((_, i) => <line key={i} x1={Math.random()*800} y1={Math.random()*320} x2={Math.random()*800} y2={Math.random()*320} stroke="white" strokeWidth={0.5+Math.random()} opacity={0.05+Math.random()*0.1}/>)}
          {/* Wrapper twist edges */}
          <path d="M0,160 Q30,120 60,160 Q90,200 120,160 Q150,120 180,160" fill="none" stroke="white" strokeWidth="2" opacity="0.15"/>
          <path d="M620,160 Q650,120 680,160 Q710,200 740,160 Q770,120 800,160" fill="none" stroke="white" strokeWidth="2" opacity="0.15"/>
          {/* Shimmer */}
          {[...Array(15)].map((_, i) => (
            <rect key={i} x={Math.random()*800} y={Math.random()*320} width={20+Math.random()*40} height="1" fill="white" opacity={0.1+Math.random()*0.1} transform={`rotate(${Math.random()*180} 400 160)`}>
              <animate attributeName="opacity" values="0.05;0.2;0.05" dur={`${2+Math.random()*3}s`} repeatCount="indefinite"/>
            </rect>
          ))}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-black text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>{title}</h2><p className="text-white/70 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold bg-white/20 text-white border border-white/30" style={{ backdropFilter: "blur(10px)" }}>Unwrap Deals</button>
        </div>
      </div>
    ),
  },

  // 42. Candy Hearts
  {
    id: 42, name: "Candy Hearts", category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #fff1f2 0%, #ffe4e6 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(12)].map((_, i) => {
            const x = 50 + Math.random() * 700;
            const y = 20 + Math.random() * 280;
            const s = 0.5 + Math.random() * 0.8;
            const colors = ["#fda4af","#fb7185","#f472b6","#e879f9","#c084fc","#f9a8d4"];
            return (
              <g key={i} transform={`translate(${x},${y}) scale(${s})`} opacity={0.2 + Math.random() * 0.2}>
                <path d="M0,-12 C-6,-24 -24,-24 -24,-12 C-24,0 0,18 0,18 C0,18 24,0 24,-12 C24,-24 6,-24 0,-12Z" fill={colors[i % colors.length]}/>
                <animate attributeName="opacity" values={`${0.15+Math.random()*0.15};${0.3+Math.random()*0.2};${0.15+Math.random()*0.15}`} dur={`${3+Math.random()*3}s`} repeatCount="indefinite"/>
              </g>
            );
          })}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-black text-rose-600">{title}</h2>
          <p className="text-rose-400/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-rose-500">Sweet Love 💕</button>
        </div>
      </div>
    ),
  },

  // 43. Rainbow Ribbon
  {
    id: 43, name: "Rainbow Ribbon", category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "#fefefe" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899"].map((color, i) => (
            <path key={i} d={`M-50,${120+i*15} Q200,${80+i*20+Math.sin(i)*30} 400,${130+i*12} T850,${100+i*18}`} fill="none" stroke={color} strokeWidth="8" opacity="0.2" strokeLinecap="round">
              <animate attributeName="d" values={`M-50,${120+i*15} Q200,${80+i*20} 400,${130+i*12} T850,${100+i*18};M-50,${110+i*15} Q200,${100+i*20} 400,${120+i*12} T850,${115+i*18};M-50,${120+i*15} Q200,${80+i*20} 400,${130+i*12} T850,${100+i*18}`} dur={`${6+i*0.5}s`} repeatCount="indefinite"/>
            </path>
          ))}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-black" style={{ background: "linear-gradient(90deg, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{title}</h2>
          <p className="text-gray-400 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: "linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6, #8b5cf6)" }}>Taste Rainbow 🌈</button>
        </div>
      </div>
    ),
  },

  // 44. Mint Chocolate
  {
    id: 44, name: "Mint Chocolate", category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Chocolate chunks */}
          {[...Array(8)].map((_, i) => {
            const x = 50 + Math.random() * 700;
            const y = 20 + Math.random() * 280;
            return <rect key={i} x={x} y={y} width={15+Math.random()*20} height={12+Math.random()*15} rx="2" fill="#3e2723" opacity={0.15+Math.random()*0.1} transform={`rotate(${Math.random()*40-20} ${x} ${y})`}/>;
          })}
          {/* Mint leaves */}
          {[{x:120,y:70},{x:650,y:90},{x:400,y:250}].map((l,i) => (
            <g key={i} transform={`translate(${l.x},${l.y}) rotate(${-20+i*30})`} opacity="0.2">
              <path d="M0,0 Q12,-18 0,-36 Q-12,-18 0,0" fill="#6ee7b7"/>
              <line x1="0" y1="0" x2="0" y2="-32" stroke="#34d399" strokeWidth="0.5"/>
            </g>
          ))}
          {/* Chocolate drip */}
          <path d="M0,0 L800,0 L800,30 Q700,50 600,25 Q500,40 400,20 Q300,45 200,22 Q100,38 0,30Z" fill="#3e2723" opacity="0.2"/>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-3xl font-bold text-emerald-100">{title}</h2>
          <p className="text-teal-200/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold" style={{ background: "#3e2723", color: "#6ee7b7" }}>Choco Mint 🍃</button>
        </div>
      </div>
    ),
  },

  // 45. Candy Explosion
  {
    id: 45, name: "Candy Explosion", category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "radial-gradient(circle at 50% 50%, #fef3c7 0%, #fde68a 40%, #fbbf24 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Explosion rays */}
          <g transform="translate(400, 160)">
            {[...Array(16)].map((_, i) => {
              const angle = (i * 22.5) * Math.PI / 180;
              const colors = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#06b6d4"];
              return <line key={i} x1={Math.cos(angle)*30} y1={Math.sin(angle)*30} x2={Math.cos(angle)*400} y2={Math.sin(angle)*400} stroke={colors[i%8]} strokeWidth={2+Math.random()*3} opacity="0.12">
                <animate attributeName="opacity" values="0.08;0.2;0.08" dur={`${2+Math.random()*2}s`} repeatCount="indefinite"/>
              </line>;
            })}
          </g>
          {/* Flying candies */}
          {[...Array(20)].map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 300;
            const x = 400 + Math.cos(angle) * dist;
            const y = 160 + Math.sin(angle) * dist;
            const colors = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899"];
            const shapes = [
              <circle key={i} cx={x} cy={y} r={3+Math.random()*5} fill={colors[i%7]} opacity={0.3+Math.random()*0.2}/>,
              <rect key={i} cx={x} cy={y} x={x} y={y} width={5+Math.random()*8} height={5+Math.random()*8} rx="1" fill={colors[i%7]} opacity={0.3+Math.random()*0.2} transform={`rotate(${Math.random()*360} ${x} ${y})`}/>
            ];
            return shapes[i%2];
          })}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <h2 className="text-4xl font-black text-amber-900">{title}</h2>
          <p className="text-amber-700/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-10 py-3 rounded-full text-sm font-black text-white" style={{ background: "linear-gradient(135deg, #ef4444, #f97316, #eab308)", boxShadow: "0 4px 20px rgba(249,115,22,0.4)" }}>BOOM! Shop Now 💥</button>
        </div>
      </div>
    ),
  },

  // 46-55: More E-commerce & Mixed themes
  {
    id: 46, name: "Caramel Swirl", category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #fef3c7 0%, #d97706 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {[...Array(5)].map((_, i) => <path key={i} d={`M${100+i*150},320 Q${150+i*150},${200-i*20} ${200+i*120},${160-i*15} T${350+i*80},${60+i*10}`} fill="none" stroke="#92400e" strokeWidth={8+i*2} opacity={0.08+i*0.02} strokeLinecap="round">
            <animate attributeName="d" values={`M${100+i*150},320 Q${150+i*150},${200-i*20} ${200+i*120},${160-i*15} T${350+i*80},${60+i*10};M${110+i*150},320 Q${160+i*150},${190-i*20} ${210+i*120},${170-i*15} T${340+i*80},${50+i*10};M${100+i*150},320 Q${150+i*150},${200-i*20} ${200+i*120},${160-i*15} T${350+i*80},${60+i*10}`} dur={`${6+i*2}s`} repeatCount="indefinite"/>
          </path>)}
          {[...Array(8)].map((_, i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*320} r={2+Math.random()*2} fill="#fef3c7" opacity={0.3+Math.random()*0.2}/>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-bold text-amber-900">{title}</h2><p className="text-amber-700/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-amber-700">Caramel Treats 🍯</button>
        </div>
      </div>
    ),
  },

  {
    id: 47, name: "Sour Punch", category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #ecfccb 0%, #bef264 40%, #84cc16 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Electric zig-zag */}
          {[...Array(6)].map((_, i) => {
            const y = 30 + i * 50;
            return <polyline key={i} points={Array.from({length:20}, (_, j) => `${j*45},${y + (j%2?-15:15)}`).join(' ')} fill="none" stroke="#65a30d" strokeWidth="2" opacity={0.1+i*0.02}>
              <animate attributeName="opacity" values={`${0.05+i*0.02};${0.2+i*0.02};${0.05+i*0.02}`} dur={`${2+Math.random()*2}s`} repeatCount="indefinite"/>
            </polyline>;
          })}
          {/* Sour burst */}
          {[...Array(10)].map((_, i) => {
            const angle = (i * 36) * Math.PI / 180;
            return <line key={i} x1={400+Math.cos(angle)*20} y1={160+Math.sin(angle)*20} x2={400+Math.cos(angle)*(60+Math.random()*40)} y2={160+Math.sin(angle)*(60+Math.random()*40)} stroke="#4d7c0f" strokeWidth="2" opacity="0.15" strokeLinecap="round"/>;
          })}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-black text-green-900">{title}</h2><p className="text-lime-700/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-lime-600">Sour Power ⚡</button>
        </div>
      </div>
    ),
  },

  {
    id: 48, name: "Taffy Pull", category: "Candy",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "#fdf4ff" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Taffy stretched lines */}
          {[
            {color:"#f9a8d4", y:80}, {color:"#c4b5fd", y:120},
            {color:"#93c5fd", y:160}, {color:"#86efac", y:200}, {color:"#fcd34d", y:240}
          ].map((t, i) => (
            <path key={i} d={`M-20,${t.y} Q200,${t.y-30} 400,${t.y} T820,${t.y+10}`} fill="none" stroke={t.color} strokeWidth="18" opacity="0.25" strokeLinecap="round">
              <animate attributeName="d" values={`M-20,${t.y} Q200,${t.y-30} 400,${t.y} T820,${t.y+10};M-20,${t.y+15} Q200,${t.y+10} 400,${t.y-10} T820,${t.y-5};M-20,${t.y} Q200,${t.y-30} 400,${t.y} T820,${t.y+10}`} dur={`${5+i}s`} repeatCount="indefinite"/>
            </path>
          ))}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full"><h2 className="text-3xl font-black text-fuchsia-600">{title}</h2><p className="text-purple-400/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-fuchsia-500">Pull & Play 🍬</button>
        </div>
      </div>
    ),
  },

  {
    id: 49, name: "New Arrivals", category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Decorative circles */}
          <circle cx="700" cy="80" r="60" fill="none" stroke="#c084fc" strokeWidth="1" opacity="0.15"/>
          <circle cx="700" cy="80" r="80" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.1"/>
          <circle cx="100" cy="260" r="40" fill="none" stroke="#c084fc" strokeWidth="1" opacity="0.15"/>
          {/* Floating tags */}
          <g transform="translate(620, 200)" opacity="0.15"><rect x="0" y="0" width="40" height="25" rx="3" fill="#a855f7"/><circle cx="8" cy="12" r="3" fill="white"/></g>
          <g transform="translate(130, 60)" opacity="0.12"><rect x="0" y="0" width="35" height="22" rx="3" fill="#c084fc"/><circle cx="7" cy="11" r="2.5" fill="white"/></g>
          {/* Stars */}
          {[...Array(8)].map((_, i) => <text key={i} x={100+Math.random()*600} y={50+Math.random()*220} fontSize="12" fill="#c084fc" opacity="0.2">✦</text>)}
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <span className="text-purple-500 text-xs tracking-widest uppercase mb-2 font-semibold">✨ Just Dropped</span>
          <h2 className="text-3xl font-bold text-purple-900">{title}</h2>
          <p className="text-purple-500/60 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-8 py-2.5 rounded-full text-sm font-bold text-white bg-purple-600">Discover New →</button>
        </div>
      </div>
    ),
  },

  {
    id: 50, name: "Midnight Sale", category: "E-Commerce",
    render: (title, subtitle) => (
      <div className="relative w-full h-72 overflow-hidden rounded-2xl" style={{ background: "linear-gradient(180deg, #020617 0%, #0f172a 50%, #1e293b 100%)" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 320">
          {/* Moon */}
          <circle cx="650" cy="80" r="35" fill="#fef3c7" opacity="0.15"/>
          <circle cx="640" cy="75" r="30" fill="#020617" opacity="1"/>
          {/* Stars */}
          {[...Array(25)].map((_, i) => <circle key={i} cx={Math.random()*800} cy={Math.random()*200} r={0.5+Math.random()*1.5} fill="white" opacity={0.1+Math.random()*0.5}>
            <animate attributeName="opacity" values={`${Math.random()*0.3};${0.3+Math.random()*0.5};${Math.random()*0.3}`} dur={`${1+Math.random()*3}s`} repeatCount="indefinite"/>
          </circle>)}
          {/* Clock outline */}
          <g transform="translate(130, 160)" opacity="0.15">
            <circle r="30" fill="none" stroke="white" strokeWidth="1"/>
            <line x1="0" y1="0" x2="0" y2="-18" stroke="white" strokeWidth="1.5"/>
            <line x1="0" y1="0" x2="12" y2="0" stroke="white" strokeWidth="1"/>
          </g>
        </svg>
        <div className="relative z-10 flex flex-col justify-center items-center h-full">
          <span className="text-yellow-300/60 text-xs tracking-widest uppercase mb-2">🌙 Midnight Only</span>
          <h2 className="text-4xl font-black text-white">{title}</h2>
          <p className="text-slate-400 mt-2 text-sm">{subtitle}</p>
          <button className="mt-4 px-10 py-3 rounded-full text-sm font-bold bg-yellow-400 text-slate-900">Shop Before Dawn</button>
        </div>
      </div>
    ),
  },
];

const categories = ["All", ...new Set(bannerThemes.map(t => t.category))];

export default function BannerThemesGallery() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [customTitle, setCustomTitle] = useState("Your Amazing Title");
  const [customSubtitle, setCustomSubtitle] = useState("Subtitle goes here");
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = bannerThemes.filter(t => {
    const matchCat = selectedCategory === "All" || t.category === selectedCategory;
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen" style={{ background: "#08080c", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-50" style={{ background: "rgba(8,8,12,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                🎨 Banner Themes
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-normal">{bannerThemes.length} themes</span>
              </h1>
              <p className="text-gray-500 text-xs mt-1">Advanced CMS banner collection with SVG animations</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="text-sm rounded-lg px-4 py-2 w-40 outline-none" style={{ background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.08)" }}/>
              </div>
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                {["grid","list"].map(m => (
                  <button key={m} onClick={() => setViewMode(m)} className="px-3 py-1.5 text-xs capitalize" style={{ background: viewMode === m ? "rgba(255,255,255,0.08)" : "transparent", color: viewMode === m ? "white" : "#555" }}>{m}</button>
                ))}
              </div>
            </div>
          </div>
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{ background: selectedCategory === cat ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.03)", color: selectedCategory === cat ? "#c4b5fd" : "#666", border: `1px solid ${selectedCategory === cat ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.05)"}` }}>
                {cat === "Candy" ? "🍬 " : cat === "E-Commerce" ? "🛒 " : cat === "Nature" ? "🌿 " : cat === "Tech" ? "⚡ " : cat === "Space" ? "🌌 " : cat === "Luxury" ? "💎 " : cat === "Modern" ? "✨ " : cat === "Creative" ? "🎨 " : cat === "Retro" ? "📼 " : cat === "Abstract" ? "🔮 " : cat === "Minimal" ? "◻️ " : ""}{cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customizer */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex gap-4 items-center mb-6 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-gray-500 text-xs">Preview:</span>
          <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Title"
            className="text-sm rounded-lg px-4 py-2 flex-1 outline-none" style={{ background: "rgba(255,255,255,0.04)", color: "white", border: "1px solid rgba(255,255,255,0.06)" }}/>
          <input type="text" value={customSubtitle} onChange={e => setCustomSubtitle(e.target.value)} placeholder="Subtitle"
            className="text-sm rounded-lg px-4 py-2 flex-1 outline-none" style={{ background: "rgba(255,255,255,0.04)", color: "white", border: "1px solid rgba(255,255,255,0.06)" }}/>
        </div>
      </div>

      {/* Themes Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "flex flex-col gap-6"}>
          {filtered.map(theme => (
            <div key={theme.id} onClick={() => setSelectedTheme(selectedTheme === theme.id ? null : theme.id)}>
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-violet-400/60 text-xs font-mono">#{String(theme.id).padStart(2,'0')}</span>
                  <span className="text-gray-300 text-sm font-medium">{theme.name}</span>
                </div>
                <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "#777" }}>{theme.category}</span>
              </div>
              <div className="rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer" style={{ border: selectedTheme === theme.id ? "2px solid rgba(139,92,246,0.5)" : "2px solid rgba(255,255,255,0.03)", boxShadow: selectedTheme === theme.id ? "0 0 30px rgba(139,92,246,0.15)" : "none" }}>
                {theme.render(customTitle, customSubtitle)}
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center py-20"><p className="text-gray-600">No themes match your search.</p></div>}
      </div>
    </div>
  );
}

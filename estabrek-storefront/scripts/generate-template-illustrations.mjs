// Original, local vector artwork for starter templates. Re-run with node; no remote assets.
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const palettes = {
  fashion: ["#e9ddd1", "#91654e", "#e8bba1"], beauty: ["#e9e5da", "#547864", "#d0a89a"],
  perfume: ["#e7dcc9", "#6d4c30", "#d3aa63"], jewelry: ["#ede5d6", "#a88442", "#e1c280"],
  electronics: ["#e1e6ef", "#384f75", "#8aace8"], gaming: ["#181c30", "#8271e8", "#8ce1d1"],
  home: ["#e4ddd0", "#8b7053", "#c7a786"], coffee: ["#e5d7be", "#775439", "#b7936c"],
  food: ["#eee0c7", "#9e683b", "#d7a96d"], kids: ["#f4e8d4", "#de8a63", "#7faba0"],
  books: ["#e9e3d8", "#4d605c", "#c6a073"], art: ["#efe9e0", "#a35d45", "#d9ad78"],
  sports: ["#e6ece5", "#355b4d", "#c9a84c"], pets: ["#f0e6d8", "#8d6548", "#bf8e68"],
  flowers: ["#e6ecdf", "#486c4c", "#d9a2a0"], music: ["#e9e0d6", "#634b3a", "#bd8d57"],
  stationery: ["#ece9e2", "#4e6470", "#c5a06c"], kitchen: ["#e9e2d7", "#6f7d64", "#c89d6c"],
  outdoor: ["#e2e5d8", "#485c3b", "#b98753"], shoes: ["#eee6db", "#7e6555", "#c2a27e"],
};
const rect = (x, y, w, h, r = 14, fill = "url(#paint)") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
const circle = (x, y, r, fill = "url(#paint)") => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const shapes = {
  fashion: [
    '<path d="M200 125 125 168 82 250 137 280 169 230 169 435 343 435 343 230 375 280 430 250 387 168 312 125C295 170 217 170 200 125Z" fill="url(#paint)"/><path d="M256 165V435M200 125Q256 202 312 125" fill="none" stroke="#fff8" stroke-width="4"/>',
    `${rect(145, 125, 222, 180, 28)}<path d="M165 290 145 450 240 450 256 340 272 450 367 450 347 290Z" fill="url(#paint)"/>`,
    '<path d="M215 120 195 175 210 230 135 450 377 450 302 230 317 175 297 120 270 160 242 160Z" fill="url(#paint)"/>',
    '<path d="M190 130 115 175 75 330 145 345 174 245 174 440 338 440 338 245 367 345 437 330 397 175 322 130 285 190 256 165 227 190Z" fill="url(#paint)"/><path d="M256 165V440" stroke="#fff8" stroke-width="4"/>',
    '<path d="M162 130H350L380 450H275L256 245 237 450H132Z" fill="url(#paint)"/>',
    `${rect(135, 200, 242, 235, 24)}<path d="M190 205V170a66 66 0 0 1 132 0v35" fill="none" stroke="currentColor" stroke-width="20"/>`,
  ],
  beauty: [rect(195, 170, 122, 270, 34) + rect(210, 125, 92, 62, 8), rect(150, 255, 212, 170, 34) + rect(145, 225, 222, 45, 10), rect(195, 220, 122, 210, 24) + rect(220, 150, 72, 90, 10), rect(175, 165, 162, 270, 40) + rect(210, 120, 92, 60, 8), rect(140, 200, 232, 232, 116), rect(105, 220, 130, 200, 20) + rect(265, 150, 140, 270, 28)],
  perfume: Array.from({ length: 6 }, (_, i) => rect(150 + i * 4, 220 - i * 8, 212 - i * 8, 210 + i * 8, i % 2 ? 65 : 8) + rect(205, 150, 102, 80, 8)),
  jewelry: [
    '<circle cx="256" cy="292" r="115" fill="none" stroke="currentColor" stroke-width="24"/><path d="M215 163 235 130H277L297 163 256 205Z" fill="url(#paint)"/>',
    '<path d="M140 130Q100 320 256 405 412 320 372 130" fill="none" stroke="currentColor" stroke-width="8"/>' + circle(256, 385, 35),
    '<circle cx="160" cy="280" r="75" fill="none" stroke="currentColor" stroke-width="14"/><circle cx="352" cy="280" r="75" fill="none" stroke="currentColor" stroke-width="14"/>',
    '<ellipse cx="256" cy="295" rx="150" ry="90" fill="none" stroke="currentColor" stroke-width="20"/>',
    '<path d="M155 110Q130 230 256 320 382 230 357 110" fill="none" stroke="currentColor" stroke-width="7"/>' + rect(218, 315, 76, 96, 35),
    rect(110, 180, 292, 240, 12) + '<circle cx="256" cy="280" r="72" fill="none" stroke="#fff9" stroke-width="8"/>',
  ],
  electronics: [
    rect(165, 100, 182, 340, 30) + rect(177, 114, 158, 310, 22, "#d5e1ec") + rect(220, 125, 72, 12, 6, "#263649"),
    rect(100, 135, 312, 220, 16) + rect(114, 149, 284, 190, 6, "#b7cfe4") + '<path d="M100 355 65 400Q256 430 447 400L412 355Z" fill="currentColor"/>',
    '<path d="M143 310V235a113 113 0 0 1 226 0v75" fill="none" stroke="currentColor" stroke-width="36"/>' + rect(117, 260, 65, 130, 28) + rect(330, 260, 65, 130, 28),
    rect(225, 95, 62, 350, 22) + rect(174, 190, 164, 164, 40) + rect(185, 201, 142, 142, 30, "#c8daed"),
    rect(155, 215, 202, 175, 25) + rect(190, 160, 18, 70, 4) + rect(304, 160, 18, 70, 4),
    rect(155, 130, 202, 310, 40) + circle(256, 245, 62, "#263649") + circle(256, 365, 30, "#263649"),
  ],
  gaming: [
    '<path d="M147 210Q110 215 95 330T165 385L210 340H302L347 385Q432 405 417 330T365 210Z" fill="url(#paint)"/><path d="M155 265v65m-32-32h64" stroke="#e9fff1" stroke-width="14"/>' + circle(339, 276, 12, "#baf5dc") + circle(373, 307, 12, "#dfb9ff"),
    rect(65, 205, 382, 200, 18) + Array.from({ length: 40 }, (_, i) => rect(80 + (i % 10) * 36, 222 + Math.floor(i / 10) * 40, 26, 28, 5, i % 3 ? "#c4b8f1" : "#a9edda")).join(""),
    rect(175, 150, 162, 280, 80) + '<path d="M256 150V260" stroke="#bff7e2" stroke-width="5"/>' + rect(246, 185, 20, 48, 8, "#e0d9ff"),
    '<path d="M143 310V235a113 113 0 0 1 226 0v75" fill="none" stroke="currentColor" stroke-width="36"/>' + rect(117, 260, 65, 130, 22) + rect(330, 260, 65, 130, 22),
    rect(65, 180, 382, 240, 25) + '<path d="M100 360 260 225 415 300" fill="none" stroke="#b1f4da" stroke-width="6"/>',
    '<path d="M130 130V400H382V130" fill="none" stroke="currentColor" stroke-width="20" stroke-linecap="round"/>',
  ],
  home: [rect(125, 225, 262, 150, 40) + rect(140, 135, 232, 160, 45) + rect(145, 355, 18, 100, 5) + rect(350, 355, 18, 100, 5), rect(110, 205, 292, 38, 18) + rect(145, 240, 20, 200, 5) + rect(347, 240, 20, 200, 5), '<path d="M180 160H332L380 300H132Z" fill="url(#paint)"/>' + rect(246, 300, 20, 120, 5) + rect(180, 420, 152, 18, 8), rect(140, 190, 232, 232, 48), '<path d="M220 160H292V225Q380 290 340 425H172Q132 290 220 225Z" fill="url(#paint)"/>', rect(100, 250, 312, 28, 6) + rect(130, 278, 20, 115, 4) + rect(362, 278, 20, 115, 4)],
  coffee: [rect(160, 150, 192, 285, 20) + rect(175, 175, 162, 15, 3, "#f6e4bc"), rect(160, 150, 192, 285, 20) + circle(256, 290, 52, "#dbc4a2"), rect(190, 230, 132, 205, 20) + rect(180, 205, 152, 30, 8) + '<path d="M256 205V155H360" stroke="currentColor" stroke-width="12" fill="none"/>', '<path d="M155 160H357L292 330H220Z" fill="url(#paint)"/>' + rect(180, 340, 152, 90, 20), rect(155, 200, 192, 200, 28) + '<path d="M347 225H365a60 60 0 0 1 0 120h-18" stroke="currentColor" stroke-width="20" fill="none"/>', rect(105, 195, 302, 235, 16)],
  food: [rect(100, 200, 312, 220, 18), circle(256, 280, 145, "#e9c999") + Array.from({ length: 7 }, (_, i) => `<ellipse cx="${155 + (i % 3) * 100}" cy="${220 + Math.floor(i / 3) * 65}" rx="40" ry="25" fill="url(#paint)"/>`).join(""), rect(145, 140, 222, 300, 12) + Array.from({ length: 12 }, (_, i) => rect(158 + (i % 3) * 69, 155 + Math.floor(i / 3) * 68, 58, 56, 5, "#68412d")).join(""), rect(155, 170, 202, 250, 35) + circle(256, 285, 65, "#d5b181"), rect(100, 200, 312, 220, 22) + rect(240, 200, 32, 220, 0, "#f5ddae"), '<path d="M105 230H407L370 430H142Z" fill="url(#paint)"/><path d="M160 230Q160 80 256 80T352 230" fill="none" stroke="currentColor" stroke-width="14"/>'],
  kids: [rect(120, 300, 130, 130, 10) + rect(265, 300, 130, 130, 10, "#7faba0") + rect(195, 160, 130, 130, 10, "#d9bb74"), rect(125, 150, 262, 280, 18) + '<path d="M256 155V430" stroke="#fff9" stroke-width="8"/>' + circle(256, 280, 62, "#efd69a"), rect(120, 190, 272, 230, 24) + '<path d="M256 190V420M120 305H392" stroke="#f6edd5" stroke-width="10"/>', circle(175, 175, 45) + circle(337, 175, 45) + circle(256, 240, 105) + rect(170, 285, 172, 145, 65) + circle(226, 230, 7, "#413a32") + circle(286, 230, 7, "#413a32"), rect(115, 180, 282, 245, 15) + [0, 1, 2, 3].map((i) => rect(150 + i * 52, 210, 26, 170, 5, ["#d38b62", "#7faba0", "#d6b56e", "#909ac5"][i])).join(""), rect(200, 350, 112, 70, 15) + rect(155, 260, 202, 70, 15, "#7faba0") + rect(110, 170, 292, 70, 15, "#d9bb74")],
};
// Category-specific local drawings complement the original ten illustration sets.
Object.assign(shapes, {
  books: [
    rect(140, 120, 232, 320, 12) + '<path d="M170 120V440M200 200H330M200 230H310" stroke="#fff9" stroke-width="6"/>',
    rect(155, 135, 210, 290, 8) + '<path d="M185 135V425M215 230H310M215 260H290M215 290H320" stroke="#fff9" stroke-width="4"/>',
    rect(110, 150, 292, 265, 8) + circle(256, 280, 80, "#e4cfa7") + rect(240, 200, 32, 160, 4, "#80594c"),
    '<path d="M256 165Q160 110 85 160V410Q170 360 256 410Q340 360 427 410V160Q350 110 256 165Z" fill="url(#paint)"/><path d="M256 165V410" stroke="#fff9" stroke-width="6"/>',
    rect(135, 145, 242, 280, 8) + [0, 1, 2, 3, 4].map(i => rect(190, 220 + i * 26, i % 2 ? 110 : 140, 5, 2, "#fff8")).join(""),
    rect(145, 130, 222, 305, 14) + rect(160, 130, 12, 305, 2, "#354b44") + rect(210, 130, 10, 345, 2, "#b37957"),
  ],
  art: [
    rect(120, 120, 272, 320, 2, "#a48565") + rect(134, 134, 244, 292, 0, "#f3e9d8") + circle(250, 245, 76) + '<path d="M160 390 295 220 365 390Z" fill="#5b786e"/>',
    '<path d="M205 125H307L295 215Q390 300 340 435H172Q122 300 217 215Z" fill="url(#paint)"/>',
    rect(125, 150, 262, 255, 0, "#f4e8d5") + '<path d="M140 380 215 205 290 315 365 180V390Z" fill="url(#paint)"/>',
    '<path d="M185 395V220Q185 110 295 135T300 295Q250 325 250 395Z" fill="url(#paint)"/>' + rect(145, 395, 222, 30, 3),
    rect(105, 175, 215, 255, 6, "#7d9b8c") + rect(190, 125, 215, 255, 6) + circle(295, 230, 58, "#edcf9b"),
    rect(125, 150, 262, 245, 0) + '<path d="M125 200H387M125 245H387M125 290H387M125 335H387" stroke="#f2dec4" stroke-width="12"/><path d="M145 395V440M180 395V440M215 395V440M250 395V440M285 395V440M320 395V440M355 395V440" stroke="currentColor" stroke-width="8"/>',
  ],
  sports: [
    rect(100, 215, 312, 210, 45) + '<path d="M130 260H380M130 300H380M130 340H380" stroke="#fff5" stroke-width="3"/>',
    '<ellipse cx="210" cy="280" rx="100" ry="145" fill="none" stroke="currentColor" stroke-width="30"/><ellipse cx="305" cy="285" rx="95" ry="125" fill="none" stroke="#c9a84c" stroke-width="24"/>',
    rect(195, 160, 122, 265, 35) + rect(218, 120, 76, 55, 10) + rect(208, 245, 96, 90, 10, "#d9dcc4"),
    rect(180, 255, 152, 35, 8) + rect(130, 200, 55, 145, 14) + rect(327, 200, 55, 145, 14) + rect(102, 225, 30, 95, 8) + rect(380, 225, 30, 95, 8),
    '<path d="M165 180Q65 220 125 380T345 380Q420 230 345 180" fill="none" stroke="currentColor" stroke-width="12"/>' + rect(145, 120, 32, 135, 12) + rect(335, 120, 32, 135, 12),
    rect(110, 220, 292, 190, 40) + '<path d="M185 225V195a71 71 0 0 1 142 0v30" stroke="currentColor" stroke-width="18" fill="none"/>' + rect(165, 270, 182, 75, 18, "#b6c4a4"),
  ],
  pets: [
    '<ellipse cx="256" cy="340" rx="175" ry="95" fill="url(#paint)"/><ellipse cx="256" cy="320" rx="125" ry="55" fill="#ddc5a7"/>',
    '<path d="M130 245H382L405 395H107Z" fill="url(#paint)"/><ellipse cx="256" cy="245" rx="126" ry="40" fill="#dec7aa"/>',
    '<path d="M195 170Q80 240 160 350T345 320Q390 180 290 180Q235 180 245 260" stroke="currentColor" stroke-width="18" fill="none"/>' + rect(225, 250, 45, 85, 14),
    '<path d="M170 210Q110 160 90 220T150 285L340 385Q395 435 425 375T365 310Z" fill="url(#paint)"/>',
    rect(115, 180, 282, 240, 35) + '<path d="M195 185V150a61 61 0 0 1 122 0v35" stroke="currentColor" stroke-width="16" fill="none"/>' + rect(150, 225, 212, 145, 20, "#ddc8ad") + '<path d="M180 225V370M220 225V370M260 225V370M300 225V370M340 225V370" stroke="#8d6548" stroke-width="8"/>',
    rect(215, 310, 82, 130, 28) + rect(150, 140, 212, 190, 60) + [0,1,2,3,4].map(i => rect(175+i*34, 175, 8, 115, 4, "#e9d5b9")).join(""),
  ],
  flowers: [
    '<path d="M256 305V130M256 230Q115 205 150 120Q260 115 256 230M256 275Q390 225 365 145Q260 155 256 275" fill="url(#paint)" stroke="currentColor" stroke-width="6"/><path d="M165 305H347L320 440H192Z" fill="#b99c78"/>',
    '<path d="M190 205 256 435 330 205" stroke="currentColor" stroke-width="8" fill="none"/>' + [0,1,2,3,4].map(i => circle(150+i*53, 190+(i%2)*35, 45, i%2 ? "#a2b292" : "#d9a2a0")).join(""),
    '<path d="M135 210H377L340 430H172Z" fill="url(#paint)"/><ellipse cx="256" cy="210" rx="121" ry="32" fill="#617a50"/>',
    '<path d="M260 325Q160 250 240 140T340 85" stroke="currentColor" stroke-width="9" fill="none"/>' + [0,1,2,3].map(i => `<ellipse cx="${220+(i%2)*80}" cy="${140+i*47}" rx="52" ry="24" transform="rotate(${i%2 ? -30:30} ${220+(i%2)*80} ${140+i*47})" fill="url(#paint)"/>`).join("") + rect(185, 325, 142, 110, 18, "#b4a588"),
    '<path d="M220 130H292V225Q365 295 340 435H172Q147 295 220 225Z" fill="#8ba59b" opacity=".8"/><path d="M215 265H300" stroke="#fff8" stroke-width="5"/>',
    rect(140, 220, 160, 185, 25) + '<path d="M290 245 405 185 350 335" fill="url(#paint)"/><path d="M145 240Q60 190 100 330H145" fill="none" stroke="currentColor" stroke-width="16"/>' + rect(200, 135, 30, 100, 8),
  ],
  music: [
    '<path d="M240 125H272V265Q350 240 365 310T285 440Q170 465 150 375T230 275Z" fill="url(#paint)"/>' + circle(256, 340, 36, "#4c382b") + '<path d="M250 140V390M262 140V390" stroke="#e8d7b4" stroke-width="3"/>',
    rect(70, 215, 372, 175, 15) + Array.from({length:12},(_,i)=>rect(84+i*29,250,25,120,2,"#eee7d7")).join("") + [0,1,3,4,5,7,8,10].map(i=>rect(100+i*29,250,18,65,2,"#4f463e")).join(""),
    rect(210, 110, 92, 190, 46) + '<path d="M185 230V260a71 71 0 0 0 142 0V230M256 335V425M195 425H317" stroke="currentColor" stroke-width="14" fill="none"/>' + '<path d="M225 155H287M225 180H287M225 205H287" stroke="#e1c6a2" stroke-width="6"/>',
    '<path d="M143 310V235a113 113 0 0 1 226 0v75" fill="none" stroke="currentColor" stroke-width="30"/>' + rect(120, 265, 60, 125, 24) + rect(332, 265, 60, 125, 24),
    rect(110, 220, 292, 160, 20) + circle(180, 300, 30, "#e4c69f") + circle(285, 300, 17, "#4b382c") + circle(345, 300, 17, "#4b382c") + rect(145, 345, 220, 5, 2, "#e4c69f"),
    '<path d="M256 280V425M180 445 256 405 332 445M135 140H377L350 285H162Z" fill="url(#paint)" stroke="currentColor" stroke-width="10"/>',
  ],
  stationery: [
    rect(145, 130, 222, 305, 14) + '<path d="M177 130V435M205 220H330M205 250H330M205 280H330" stroke="#e9dfc7" stroke-width="5"/>',
    '<path d="M230 120H282V365L256 435 230 365Z" fill="url(#paint)"/><path d="M230 345H282M256 395V435" stroke="#e7d8bc" stroke-width="5"/>' + rect(230, 105, 52, 30, 8),
    rect(120, 270, 272, 150, 12) + rect(140, 165, 75, 120, 8) + rect(225, 210, 65, 75, 8, "#a9b9b2") + rect(300, 180, 70, 105, 8, "#ceb28e"),
    rect(125, 140, 262, 285, 10, "#e8dbc2") + '<path d="M160 210Q240 140 320 230T280 350" stroke="currentColor" stroke-width="8" fill="none"/>' + rect(125, 140, 18, 285, 3),
    rect(110, 180, 240, 220, 6, "#c8b89a") + rect(165, 140, 240, 220, 6, "#e9dfca") + '<path d="M200 220H365M200 250H340M200 280H350" stroke="currentColor" stroke-width="5"/>',
    rect(90, 230, 332, 150, 35) + '<path d="M120 255H390" stroke="#e8d9bf" stroke-width="7"/>' + rect(365, 244, 18, 35, 5, "#e8d9bf"),
  ],
  kitchen: [
    rect(140, 220, 232, 195, 28) + rect(125, 200, 262, 28, 12) + rect(220, 170, 72, 30, 12) + rect(95, 260, 50, 25, 10) + rect(367, 260, 50, 25, 10),
    rect(145, 190, 222, 240, 35) + rect(220, 115, 72, 110, 28) + circle(256, 145, 10, "#e9e2d7"),
    '<ellipse cx="256" cy="300" rx="178" ry="105" fill="url(#paint)"/><ellipse cx="256" cy="300" rx="142" ry="78" fill="none" stroke="#dfe1cf" stroke-width="7"/>',
    '<path d="M115 175H245L230 410H130ZM280 200H410L395 435H295Z" fill="#95aba0" opacity=".8"/><path d="M125 210H235M290 235H400" stroke="#fff8" stroke-width="5"/>',
    '<path d="M100 245H412Q385 425 256 425T100 245Z" fill="url(#paint)"/><ellipse cx="256" cy="245" rx="156" ry="40" fill="#dfe0cc"/>',
    '<path d="M145 135H367V425H145Z" fill="#d8bf96"/><path d="M170 135V425M200 135V425M290 135V425M320 135V425" stroke="currentColor" stroke-width="8"/>',
  ],
  outdoor: [
    rect(155, 160, 202, 275, 55) + rect(175, 300, 162, 100, 24, "#849371") + '<path d="M210 165V140a46 46 0 0 1 92 0v25M155 230H125V340H155M357 230H387V340H357" stroke="currentColor" stroke-width="14" fill="none"/>',
    '<path d="M65 420 256 140 447 420Z" fill="url(#paint)"/><path d="M256 140 180 420H335Z" fill="#c9ad7d"/><path d="M256 255 210 420H300Z" fill="#485c3b"/>',
    rect(195, 170, 122, 260, 30) + rect(210, 120, 92, 65, 15) + rect(210, 260, 92, 95, 5, "#c2b68d"),
    rect(175, 240, 162, 145, 15, "#e4d4a5") + rect(165, 220, 182, 25, 10) + rect(165, 385, 182, 28, 10) + '<path d="M205 225V190a51 51 0 0 1 102 0v35" stroke="currentColor" stroke-width="12" fill="none"/>',
    '<path d="M145 210 190 330H322L367 210M190 330 145 440M322 330 367 440" stroke="currentColor" stroke-width="14" fill="none"/>' + '<path d="M145 210H367L322 330H190Z" fill="url(#paint)"/>',
    rect(175, 110, 162, 325, 70) + rect(190, 125, 132, 95, 45, "#c6ba93") + '<path d="M256 220V415M190 270H322M190 320H322M190 370H322" stroke="#d7c8a3" stroke-width="5"/>',
  ],
  shoes: Array.from({length:6},(_,i)=>`<path d="M100 ${300-i*5} 145 200 235 220 285 285 375 315Q435 330 425 385H90Q72 345 100 ${300-i*5}Z" fill="url(#paint)"/><path d="M90 385H425M180 255 240 265M200 280 260 290" stroke="#efe4d1" stroke-width="${8+i}"/>`),
});

for (const [kind, [bg, primary, accent]] of Object.entries(palettes)) {
  const dir = fileURLToPath(new URL(`../public/templates/${kind}/`, import.meta.url));
  await mkdir(dir, { recursive: true });
  for (const name of ["hero", "story", ...Array.from({ length: 6 }, (_, i) => `product-${i + 1}`)]) {
    const i = name === "hero" ? 0 : name === "story" ? 1 : Number(name.split("-")[1]) - 1;
    const wide = name === "hero" || name === "story";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${wide ? 960 : 512} 560" role="img"><title>${kind} starter illustration</title><defs><linearGradient id="paint" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="${primary}"/></linearGradient><radialGradient id="light"><stop stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="shadow" x="-50%" y="-30%" width="200%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="15" flood-color="#171923" flood-opacity=".16"/></filter></defs><rect width="100%" height="100%" fill="${bg}"/><circle cx="${wide ? 630 : 380}" cy="100" r="400" fill="url(#light)"/><path d="M0 460Q250 390 512 470T960 450V560H0Z" fill="${primary}" opacity=".08"/><g transform="translate(${wide ? 224 : 0} 0)" color="${primary}"><ellipse cx="256" cy="458" rx="168" ry="22" fill="${primary}" opacity=".1"/><g filter="url(#shadow)">${shapes[kind][i]}</g><circle cx="90" cy="110" r="9" fill="${accent}"/><path d="M405 105v24m-12-12h24" stroke="${primary}" opacity=".35" stroke-width="2"/></g></svg>\n`;
    await writeFile(`${dir}/${name}.svg`, svg);
  }
}
console.log(`Created ${Object.keys(palettes).length * 8} local starter illustrations for ${Object.keys(palettes).length} store categories.`);

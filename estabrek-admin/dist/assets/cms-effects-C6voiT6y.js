const F={transform:"تحويلات",shadow:"ظلال",color:"ألوان",border:"حدود",glow:"توهج",image:"صور",overlay:"تغطيات",text:"نصوص",button:"أزرار",card:"بطاقات",link:"روابط","3d":"ثلاثي الأبعاد",animation:"حركات"},k=[{id:"hover-scale-up",name:"Scale Up",nameAr:"تكبير",category:"transform",hoverClassName:"transition-transform duration-300 hover:scale-105",focusClassName:"transition-transform duration-300 focus-within:scale-105"},{id:"hover-scale-up-lg",name:"Scale Up Large",nameAr:"تكبير كبير",category:"transform",hoverClassName:"transition-transform duration-300 hover:scale-110",focusClassName:"transition-transform duration-300 focus-within:scale-110"},{id:"hover-scale-down",name:"Scale Down",nameAr:"تصغير",category:"transform",hoverClassName:"transition-transform duration-300 hover:scale-95",focusClassName:"transition-transform duration-300 focus-within:scale-95"},{id:"hover-rotate-cw",name:"Rotate Clockwise",nameAr:"دوران مع عقارب الساعة",category:"transform",hoverClassName:"transition-transform duration-300 hover:rotate-3",focusClassName:"transition-transform duration-300 focus-within:rotate-3"},{id:"hover-rotate-ccw",name:"Rotate Counter-Clockwise",nameAr:"دوران عكس عقارب الساعة",category:"transform",hoverClassName:"transition-transform duration-300 hover:-rotate-3",focusClassName:"transition-transform duration-300 focus-within:-rotate-3"},{id:"hover-rotate-full",name:"Rotate Full",nameAr:"دوران كامل",category:"transform",hoverClassName:"transition-transform duration-500 hover:rotate-180",focusClassName:"transition-transform duration-500 focus-within:rotate-180"},{id:"hover-skew-x",name:"Skew X",nameAr:"ميل أفقي",category:"transform",hoverClassName:"transition-transform duration-300 hover:skew-x-3",focusClassName:"transition-transform duration-300 focus-within:skew-x-3"},{id:"hover-skew-y",name:"Skew Y",nameAr:"ميل عمودي",category:"transform",hoverClassName:"transition-transform duration-300 hover:skew-y-3",focusClassName:"transition-transform duration-300 focus-within:skew-y-3"},{id:"hover-translate-up",name:"Translate Up",nameAr:"تحريك للأعلى",category:"transform",hoverClassName:"transition-transform duration-300 hover:-translate-y-2",focusClassName:"transition-transform duration-300 focus-within:-translate-y-2"},{id:"hover-translate-down",name:"Translate Down",nameAr:"تحريك للأسفل",category:"transform",hoverClassName:"transition-transform duration-300 hover:translate-y-2",focusClassName:"transition-transform duration-300 focus-within:translate-y-2"},{id:"hover-translate-left",name:"Translate Left",nameAr:"تحريك لليسار",category:"transform",hoverClassName:"transition-transform duration-300 hover:-translate-x-2",focusClassName:"transition-transform duration-300 focus-within:-translate-x-2"},{id:"hover-translate-right",name:"Translate Right",nameAr:"تحريك لليمين",category:"transform",hoverClassName:"transition-transform duration-300 hover:translate-x-2",focusClassName:"transition-transform duration-300 focus-within:translate-x-2"},{id:"hover-lift",name:"Lift",nameAr:"رفع",category:"transform",hoverClassName:"transition-all duration-300 hover:-translate-y-2 hover:shadow-lg",focusClassName:"transition-all duration-300 focus-within:-translate-y-2 focus-within:shadow-lg"},{id:"hover-sink",name:"Sink",nameAr:"غرق",category:"transform",hoverClassName:"transition-all duration-300 hover:translate-y-1 hover:shadow-sm",focusClassName:"transition-all duration-300 focus-within:translate-y-1 focus-within:shadow-sm"},{id:"hover-grow-rotate",name:"Grow & Rotate",nameAr:"تكبير ودوران",category:"transform",hoverClassName:"transition-transform duration-300 hover:scale-110 hover:rotate-3",focusClassName:"transition-transform duration-300 focus-within:scale-110 focus-within:rotate-3"},{id:"hover-shadow-sm",name:"Shadow Small",nameAr:"ظل صغير",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-md",focusClassName:"transition-shadow duration-300 focus-within:shadow-md"},{id:"hover-shadow-md",name:"Shadow Medium",nameAr:"ظل متوسط",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-lg",focusClassName:"transition-shadow duration-300 focus-within:shadow-lg"},{id:"hover-shadow-lg",name:"Shadow Large",nameAr:"ظل كبير",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-xl",focusClassName:"transition-shadow duration-300 focus-within:shadow-xl"},{id:"hover-shadow-xl",name:"Shadow Extra Large",nameAr:"ظل كبير جداً",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-2xl",focusClassName:"transition-shadow duration-300 focus-within:shadow-2xl"},{id:"hover-shadow-color-blue",name:"Shadow Blue",nameAr:"ظل أزرق",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-lg hover:shadow-blue-500/30",focusClassName:"transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-blue-500/30"},{id:"hover-shadow-color-purple",name:"Shadow Purple",nameAr:"ظل بنفسجي",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-lg hover:shadow-purple-500/30",focusClassName:"transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-purple-500/30"},{id:"hover-shadow-color-pink",name:"Shadow Pink",nameAr:"ظل وردي",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-lg hover:shadow-pink-500/30",focusClassName:"transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-pink-500/30"},{id:"hover-shadow-color-green",name:"Shadow Green",nameAr:"ظل أخضر",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-lg hover:shadow-green-500/30",focusClassName:"transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-green-500/30"},{id:"hover-shadow-color-orange",name:"Shadow Orange",nameAr:"ظل برتقالي",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-lg hover:shadow-orange-500/30",focusClassName:"transition-shadow duration-300 focus-within:shadow-lg focus-within:shadow-orange-500/30"},{id:"hover-shadow-glow",name:"Shadow Glow",nameAr:"ظل متوهج",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(59,130,246,0.5)]"},{id:"hover-shadow-neon",name:"Shadow Neon",nameAr:"ظل نيون",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_20px_rgba(0,255,255,0.6),0_0_40px_rgba(0,255,255,0.3)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_20px_rgba(0,255,255,0.6),0_0_40px_rgba(0,255,255,0.3)]"},{id:"hover-shadow-inner",name:"Shadow Inner",nameAr:"ظل داخلي",category:"shadow",hoverClassName:"transition-shadow duration-300 hover:shadow-inner",focusClassName:"transition-shadow duration-300 focus-within:shadow-inner"},{id:"hover-bg-darken",name:"Background Darken",nameAr:"تعتيم الخلفية",category:"color",hoverClassName:"transition-colors duration-300 hover:bg-black/10",focusClassName:"transition-colors duration-300 focus-within:bg-black/10"},{id:"hover-bg-lighten",name:"Background Lighten",nameAr:"تفتيح الخلفية",category:"color",hoverClassName:"transition-colors duration-300 hover:bg-white/10",focusClassName:"transition-colors duration-300 focus-within:bg-white/10"},{id:"hover-bg-blue",name:"Background Blue",nameAr:"خلفية زرقاء",category:"color",hoverClassName:"transition-colors duration-300 hover:bg-blue-500 hover:text-white",focusClassName:"transition-colors duration-300 focus-within:bg-blue-500 focus-within:text-white"},{id:"hover-bg-gradient",name:"Background Gradient",nameAr:"خلفية متدرجة",category:"color",hoverClassName:"transition-all duration-300 bg-gray-100 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white",focusClassName:"transition-all duration-300 bg-gray-100 focus-within:bg-gradient-to-r focus-within:from-blue-500 focus-within:to-purple-500 focus-within:text-white"},{id:"hover-text-blue",name:"Text Blue",nameAr:"نص أزرق",category:"color",hoverClassName:"transition-colors duration-300 hover:text-blue-500",focusClassName:"transition-colors duration-300 focus-within:text-blue-500"},{id:"hover-text-gradient",name:"Text Gradient",nameAr:"نص متدرج",category:"color",hoverClassName:"transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:bg-clip-text hover:text-transparent",focusClassName:"transition-all duration-300 focus-within:bg-gradient-to-r focus-within:from-blue-500 focus-within:to-purple-500 focus-within:bg-clip-text focus-within:text-transparent"},{id:"hover-invert",name:"Invert Colors",nameAr:"عكس الألوان",category:"color",hoverClassName:"transition-all duration-300 bg-white text-black hover:bg-black hover:text-white",focusClassName:"transition-all duration-300 bg-white text-black focus-within:bg-black focus-within:text-white"},{id:"hover-opacity-down",name:"Opacity Down",nameAr:"تقليل الشفافية",category:"color",hoverClassName:"transition-opacity duration-300 hover:opacity-70",focusClassName:"transition-opacity duration-300 focus-within:opacity-70"},{id:"hover-opacity-up",name:"Opacity Up",nameAr:"زيادة الشفافية",category:"color",hoverClassName:"transition-opacity duration-300 opacity-70 hover:opacity-100",focusClassName:"transition-opacity duration-300 opacity-70 focus-within:opacity-100"},{id:"hover-brightness-up",name:"Brightness Up",nameAr:"زيادة السطوع",category:"color",hoverClassName:"transition-all duration-300 hover:brightness-110",focusClassName:"transition-all duration-300 focus-within:brightness-110"},{id:"hover-brightness-down",name:"Brightness Down",nameAr:"تقليل السطوع",category:"color",hoverClassName:"transition-all duration-300 hover:brightness-90",focusClassName:"transition-all duration-300 focus-within:brightness-90"},{id:"hover-saturate",name:"Saturate",nameAr:"تشبع",category:"color",hoverClassName:"transition-all duration-300 hover:saturate-150",focusClassName:"transition-all duration-300 focus-within:saturate-150"},{id:"hover-border-appear",name:"Border Appear",nameAr:"ظهور الحد",category:"border",hoverClassName:"border-2 border-transparent transition-colors duration-300 hover:border-gray-900",focusClassName:"border-2 border-transparent transition-colors duration-300 focus-within:border-gray-900"},{id:"hover-border-color",name:"Border Color Change",nameAr:"تغيير لون الحد",category:"border",hoverClassName:"border-2 border-gray-300 transition-colors duration-300 hover:border-blue-500",focusClassName:"border-2 border-gray-300 transition-colors duration-300 focus-within:border-blue-500"},{id:"hover-border-width",name:"Border Width",nameAr:"زيادة عرض الحد",category:"border",hoverClassName:"border border-gray-300 transition-all duration-300 hover:border-2 hover:border-gray-900",focusClassName:"border border-gray-300 transition-all duration-300 focus-within:border-2 focus-within:border-gray-900"},{id:"hover-border-bottom",name:"Border Bottom",nameAr:"حد سفلي",category:"border",hoverClassName:"border-b-2 border-transparent transition-colors duration-300 hover:border-blue-500",focusClassName:"border-b-2 border-transparent transition-colors duration-300 focus-within:border-blue-500"},{id:"hover-border-left",name:"Border Left",nameAr:"حد يساري",category:"border",hoverClassName:"border-r-4 border-transparent transition-colors duration-300 hover:border-blue-500",focusClassName:"border-r-4 border-transparent transition-colors duration-300 focus-within:border-blue-500"},{id:"hover-border-gradient",name:"Border Gradient",nameAr:"حد متدرج",category:"border",hoverClassName:"relative before:absolute before:inset-0 before:border-2 before:border-transparent before:transition-all before:duration-300 hover:before:border-blue-500",focusClassName:"relative before:absolute before:inset-0 before:border-2 before:border-transparent before:transition-all before:duration-300 focus-within:before:border-blue-500"},{id:"hover-outline",name:"Outline",nameAr:"إطار خارجي",category:"border",hoverClassName:"outline-none transition-all duration-300 hover:outline hover:outline-2 hover:outline-blue-500 hover:outline-offset-2",focusClassName:"outline-none transition-all duration-300 focus-within:outline focus-within:outline-2 focus-within:outline-blue-500 focus-within:outline-offset-2"},{id:"hover-ring",name:"Ring",nameAr:"حلقة",category:"border",hoverClassName:"transition-all duration-300 hover:ring-2 hover:ring-blue-500 hover:ring-offset-2",focusClassName:"transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"},{id:"hover-ring-pulse",name:"Ring Pulse",nameAr:"حلقة نابضة",category:"border",hoverClassName:"transition-all duration-300 hover:ring-4 hover:ring-blue-500/50 hover:ring-offset-2",focusClassName:"transition-all duration-300 focus-within:ring-4 focus-within:ring-blue-500/50 focus-within:ring-offset-2"},{id:"hover-rounded",name:"Rounded Corners",nameAr:"زوايا مستديرة",category:"border",hoverClassName:"rounded transition-all duration-300 hover:rounded-xl",focusClassName:"rounded transition-all duration-300 focus-within:rounded-xl"},{id:"hover-rounded-full",name:"Rounded Full",nameAr:"استدارة كاملة",category:"border",hoverClassName:"rounded-lg transition-all duration-300 hover:rounded-full",focusClassName:"rounded-lg transition-all duration-300 focus-within:rounded-full"},{id:"hover-border-dashed",name:"Border Dashed",nameAr:"حد متقطع",category:"border",hoverClassName:"border-2 border-solid border-gray-300 transition-all duration-300 hover:border-dashed hover:border-blue-500",focusClassName:"border-2 border-solid border-gray-300 transition-all duration-300 focus-within:border-dashed focus-within:border-blue-500"},{id:"hover-glow-cyan",name:"Glow Cyan",nameAr:"توهج سماوي",category:"glow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(0,255,255,0.6)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(0,255,255,0.6)]"},{id:"hover-glow-pink",name:"Glow Pink",nameAr:"توهج وردي",category:"glow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(236,72,153,0.6)]"},{id:"hover-glow-purple",name:"Glow Purple",nameAr:"توهج بنفسجي",category:"glow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(168,85,247,0.6)]"},{id:"hover-glow-green",name:"Glow Green",nameAr:"توهج أخضر",category:"glow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(34,197,94,0.6)]"},{id:"hover-glow-orange",name:"Glow Orange",nameAr:"توهج برتقالي",category:"glow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(249,115,22,0.6)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(249,115,22,0.6)]"},{id:"hover-glow-red",name:"Glow Red",nameAr:"توهج أحمر",category:"glow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(239,68,68,0.6)]"},{id:"hover-glow-gold",name:"Glow Gold",nameAr:"توهج ذهبي",category:"glow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(251,191,36,0.6)]"},{id:"hover-glow-white",name:"Glow White",nameAr:"توهج أبيض",category:"glow",hoverClassName:"transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]",focusClassName:"transition-shadow duration-300 focus-within:shadow-[0_0_30px_rgba(255,255,255,0.6)]"},{id:"hover-neon-border",name:"Neon Border",nameAr:"حد نيون",category:"glow",hoverClassName:"border-2 border-cyan-500 transition-shadow duration-300 hover:shadow-[0_0_10px_rgba(0,255,255,0.8),0_0_20px_rgba(0,255,255,0.6),inset_0_0_10px_rgba(0,255,255,0.4)]",focusClassName:"border-2 border-cyan-500 transition-shadow duration-300 focus-within:shadow-[0_0_10px_rgba(0,255,255,0.8),0_0_20px_rgba(0,255,255,0.6),inset_0_0_10px_rgba(0,255,255,0.4)]"},{id:"hover-neon-text",name:"Neon Text",nameAr:"نص نيون",category:"glow",hoverClassName:"transition-all duration-300 hover:[text-shadow:0_0_10px_currentColor,0_0_20px_currentColor,0_0_30px_currentColor]",focusClassName:"transition-all duration-300 focus-within:[text-shadow:0_0_10px_currentColor,0_0_20px_currentColor,0_0_30px_currentColor]"},{id:"hover-img-zoom",name:"Image Zoom",nameAr:"تكبير الصورة",category:"image",hoverClassName:"overflow-hidden [&_img]:transition-transform [&_img]:duration-500 [&:hover_img]:scale-110",focusClassName:"overflow-hidden [&_img]:transition-transform [&_img]:duration-500 [&:focus-within_img]:scale-110"},{id:"hover-img-zoom-slow",name:"Image Zoom Slow",nameAr:"تكبير بطيء",category:"image",hoverClassName:"overflow-hidden [&_img]:transition-transform [&_img]:duration-700 [&:hover_img]:scale-125",focusClassName:"overflow-hidden [&_img]:transition-transform [&_img]:duration-700 [&:focus-within_img]:scale-125"},{id:"hover-img-rotate",name:"Image Rotate",nameAr:"دوران الصورة",category:"image",hoverClassName:"overflow-hidden [&_img]:transition-transform [&_img]:duration-500 [&:hover_img]:rotate-6 [&:hover_img]:scale-110",focusClassName:"overflow-hidden [&_img]:transition-transform [&_img]:duration-500 [&:focus-within_img]:rotate-6 [&:focus-within_img]:scale-110"},{id:"hover-img-grayscale",name:"Image Grayscale",nameAr:"صورة رمادية",category:"image",hoverClassName:"[&_img]:grayscale [&_img]:transition-all [&_img]:duration-500 [&:hover_img]:grayscale-0",focusClassName:"[&_img]:grayscale [&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:grayscale-0"},{id:"hover-img-grayscale-reverse",name:"Image Grayscale Reverse",nameAr:"صورة رمادية معكوس",category:"image",hoverClassName:"[&_img]:transition-all [&_img]:duration-500 [&:hover_img]:grayscale",focusClassName:"[&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:grayscale"},{id:"hover-img-blur",name:"Image Blur",nameAr:"ضبابية الصورة",category:"image",hoverClassName:"[&_img]:transition-all [&_img]:duration-500 [&:hover_img]:blur-sm",focusClassName:"[&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:blur-sm"},{id:"hover-img-unblur",name:"Image Unblur",nameAr:"إزالة الضبابية",category:"image",hoverClassName:"[&_img]:blur-sm [&_img]:transition-all [&_img]:duration-500 [&:hover_img]:blur-0",focusClassName:"[&_img]:blur-sm [&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:blur-0"},{id:"hover-img-brightness",name:"Image Brightness",nameAr:"سطوع الصورة",category:"image",hoverClassName:"[&_img]:transition-all [&_img]:duration-300 [&:hover_img]:brightness-110",focusClassName:"[&_img]:transition-all [&_img]:duration-300 [&:focus-within_img]:brightness-110"},{id:"hover-img-darken",name:"Image Darken",nameAr:"تعتيم الصورة",category:"image",hoverClassName:"[&_img]:transition-all [&_img]:duration-300 [&:hover_img]:brightness-75",focusClassName:"[&_img]:transition-all [&_img]:duration-300 [&:focus-within_img]:brightness-75"},{id:"hover-img-sepia",name:"Image Sepia",nameAr:"صورة بنية",category:"image",hoverClassName:"[&_img]:transition-all [&_img]:duration-500 [&:hover_img]:sepia",focusClassName:"[&_img]:transition-all [&_img]:duration-500 [&:focus-within_img]:sepia"},{id:"hover-img-contrast",name:"Image Contrast",nameAr:"تباين الصورة",category:"image",hoverClassName:"[&_img]:transition-all [&_img]:duration-300 [&:hover_img]:contrast-125",focusClassName:"[&_img]:transition-all [&_img]:duration-300 [&:focus-within_img]:contrast-125"},{id:"hover-img-saturate",name:"Image Saturate",nameAr:"تشبع الصورة",category:"image",hoverClassName:"[&_img]:transition-all [&_img]:duration-300 [&:hover_img]:saturate-150",focusClassName:"[&_img]:transition-all [&_img]:duration-300 [&:focus-within_img]:saturate-150"},{id:"hover-overlay-dark",name:"Overlay Dark",nameAr:"تغطية داكنة",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-black/0 before:transition-all before:duration-300 hover:before:bg-black/50",focusClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-black/0 before:transition-all before:duration-300 focus-within:before:bg-black/50"},{id:"hover-overlay-light",name:"Overlay Light",nameAr:"تغطية فاتحة",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-white/0 before:transition-all before:duration-300 hover:before:bg-white/30",focusClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-white/0 before:transition-all before:duration-300 focus-within:before:bg-white/30"},{id:"hover-overlay-gradient",name:"Overlay Gradient",nameAr:"تغطية متدرجة",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/0 before:to-transparent before:transition-all before:duration-300 hover:before:from-black/70",focusClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/0 before:to-transparent before:transition-all before:duration-300 focus-within:before:from-black/70"},{id:"hover-overlay-blue",name:"Overlay Blue",nameAr:"تغطية زرقاء",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-blue-500/0 before:transition-all before:duration-300 hover:before:bg-blue-500/50 before:mix-blend-multiply",focusClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-blue-500/0 before:transition-all before:duration-300 focus-within:before:bg-blue-500/50 before:mix-blend-multiply"},{id:"hover-overlay-purple",name:"Overlay Purple",nameAr:"تغطية بنفسجية",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-purple-500/0 before:transition-all before:duration-300 hover:before:bg-purple-500/50 before:mix-blend-multiply",focusClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-purple-500/0 before:transition-all before:duration-300 focus-within:before:bg-purple-500/50 before:mix-blend-multiply"},{id:"hover-overlay-slide-up",name:"Overlay Slide Up",nameAr:"تغطية منزلقة للأعلى",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-x-0 before:bottom-0 before:h-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:h-full",focusClassName:"relative overflow-hidden before:absolute before:inset-x-0 before:bottom-0 before:h-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:h-full"},{id:"hover-overlay-slide-down",name:"Overlay Slide Down",nameAr:"تغطية منزلقة للأسفل",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:h-full",focusClassName:"relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:h-full"},{id:"hover-overlay-slide-left",name:"Overlay Slide Left",nameAr:"تغطية منزلقة لليسار",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:w-full",focusClassName:"relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:w-full"},{id:"hover-overlay-slide-right",name:"Overlay Slide Right",nameAr:"تغطية منزلقة لليمين",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-y-0 before:right-0 before:w-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:w-full",focusClassName:"relative overflow-hidden before:absolute before:inset-y-0 before:right-0 before:w-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:w-full"},{id:"hover-overlay-zoom",name:"Overlay Zoom",nameAr:"تغطية تكبير",category:"overlay",hoverClassName:"relative overflow-hidden before:absolute before:inset-0 before:scale-0 before:bg-black/70 before:transition-all before:duration-300 hover:before:scale-100",focusClassName:"relative overflow-hidden before:absolute before:inset-0 before:scale-0 before:bg-black/70 before:transition-all before:duration-300 focus-within:before:scale-100"},{id:"hover-text-underline",name:"Text Underline",nameAr:"خط سفلي",category:"text",hoverClassName:"relative after:absolute after:bottom-0 after:right-0 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 hover:after:w-full hover:after:right-auto hover:after:left-0",focusClassName:"relative after:absolute after:bottom-0 after:right-0 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 focus-within:after:w-full focus-within:after:right-auto focus-within:after:left-0"},{id:"hover-text-underline-center",name:"Text Underline Center",nameAr:"خط سفلي من المنتصف",category:"text",hoverClassName:"relative after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 after:-translate-x-1/2 hover:after:w-full",focusClassName:"relative after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 after:-translate-x-1/2 focus-within:after:w-full"},{id:"hover-text-strike",name:"Text Strike",nameAr:"خط وسط",category:"text",hoverClassName:"relative after:absolute after:top-1/2 after:right-0 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 hover:after:w-full",focusClassName:"relative after:absolute after:top-1/2 after:right-0 after:h-0.5 after:w-0 after:bg-current after:transition-all after:duration-300 focus-within:after:w-full"},{id:"hover-text-highlight",name:"Text Highlight",nameAr:"تظليل النص",category:"text",hoverClassName:"relative z-10 before:absolute before:bottom-0 before:right-0 before:-z-10 before:h-1/3 before:w-0 before:bg-yellow-300 before:transition-all before:duration-300 hover:before:w-full",focusClassName:"relative z-10 before:absolute before:bottom-0 before:right-0 before:-z-10 before:h-1/3 before:w-0 before:bg-yellow-300 before:transition-all before:duration-300 focus-within:before:w-full"},{id:"hover-text-highlight-full",name:"Text Highlight Full",nameAr:"تظليل كامل",category:"text",hoverClassName:"relative z-10 before:absolute before:inset-0 before:-z-10 before:scale-x-0 before:bg-blue-500 before:transition-transform before:duration-300 before:origin-right hover:before:scale-x-100 hover:before:origin-left hover:text-white",focusClassName:"relative z-10 before:absolute before:inset-0 before:-z-10 before:scale-x-0 before:bg-blue-500 before:transition-transform before:duration-300 before:origin-right focus-within:before:scale-x-100 focus-within:before:origin-left focus-within:text-white"},{id:"hover-text-bounce",name:"Text Bounce",nameAr:"نص نطاط",category:"text",hoverClassName:"inline-block transition-transform duration-300 hover:animate-bounce",focusClassName:"inline-block transition-transform duration-300 focus-within:animate-bounce"},{id:"hover-text-shake",name:"Text Shake",nameAr:"نص مهتز",category:"text",hoverClassName:"inline-block transition-transform duration-300 hover:animate-pulse",focusClassName:"inline-block transition-transform duration-300 focus-within:animate-pulse"},{id:"hover-text-grow",name:"Text Grow",nameAr:"تكبير النص",category:"text",hoverClassName:"transition-all duration-300 hover:text-lg hover:font-bold",focusClassName:"transition-all duration-300 focus-within:text-lg focus-within:font-bold"},{id:"hover-text-letter-spacing",name:"Text Letter Spacing",nameAr:"تباعد الحروف",category:"text",hoverClassName:"transition-all duration-300 hover:tracking-widest",focusClassName:"transition-all duration-300 focus-within:tracking-widest"},{id:"hover-text-color-cycle",name:"Text Color Cycle",nameAr:"دورة الألوان",category:"text",hoverClassName:"transition-colors duration-300 hover:text-blue-500",focusClassName:"transition-colors duration-300 focus-within:text-blue-500"},{id:"hover-btn-fill-left",name:"Button Fill Left",nameAr:"تعبئة من اليسار",category:"button",hoverClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-x-[-100%] before:bg-blue-600 before:transition-transform before:duration-300 hover:before:translate-x-0 hover:text-white",focusClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-x-[-100%] before:bg-blue-600 before:transition-transform before:duration-300 focus-within:before:translate-x-0 focus-within:text-white"},{id:"hover-btn-fill-right",name:"Button Fill Right",nameAr:"تعبئة من اليمين",category:"button",hoverClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-x-[100%] before:bg-blue-600 before:transition-transform before:duration-300 hover:before:translate-x-0 hover:text-white",focusClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-x-[100%] before:bg-blue-600 before:transition-transform before:duration-300 focus-within:before:translate-x-0 focus-within:text-white"},{id:"hover-btn-fill-up",name:"Button Fill Up",nameAr:"تعبئة من الأسفل",category:"button",hoverClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-y-[100%] before:bg-blue-600 before:transition-transform before:duration-300 hover:before:translate-y-0 hover:text-white",focusClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-y-[100%] before:bg-blue-600 before:transition-transform before:duration-300 focus-within:before:translate-y-0 focus-within:text-white"},{id:"hover-btn-fill-down",name:"Button Fill Down",nameAr:"تعبئة من الأعلى",category:"button",hoverClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-y-[-100%] before:bg-blue-600 before:transition-transform before:duration-300 hover:before:translate-y-0 hover:text-white",focusClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:translate-y-[-100%] before:bg-blue-600 before:transition-transform before:duration-300 focus-within:before:translate-y-0 focus-within:text-white"},{id:"hover-btn-fill-center",name:"Button Fill Center",nameAr:"تعبئة من المنتصف",category:"button",hoverClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:scale-0 before:bg-blue-600 before:transition-transform before:duration-300 before:rounded-full hover:before:scale-150 hover:text-white",focusClassName:"relative overflow-hidden z-10 before:absolute before:inset-0 before:-z-10 before:scale-0 before:bg-blue-600 before:transition-transform before:duration-300 before:rounded-full focus-within:before:scale-150 focus-within:text-white"},{id:"hover-btn-slide-icon",name:"Button Slide Icon",nameAr:"زر انزلاق الأيقونة",category:"button",hoverClassName:"group flex items-center gap-2 [&_svg]:transition-transform [&_svg]:duration-300 [&:hover_svg]:translate-x-1",focusClassName:"group flex items-center gap-2 [&_svg]:transition-transform [&_svg]:duration-300 [&:focus-within_svg]:translate-x-1"},{id:"hover-btn-pulse",name:"Button Pulse",nameAr:"زر نابض",category:"button",hoverClassName:"transition-all duration-300 hover:animate-pulse",focusClassName:"transition-all duration-300 focus-within:animate-pulse"},{id:"hover-btn-3d-push",name:"Button 3D Push",nameAr:"زر ضغط ثلاثي الأبعاد",category:"button",hoverClassName:"shadow-[0_4px_0_0_#1e40af] transition-all duration-150 hover:translate-y-1 hover:shadow-[0_2px_0_0_#1e40af] active:translate-y-1 active:shadow-none",focusClassName:"shadow-[0_4px_0_0_#1e40af] transition-all duration-150 focus-within:translate-y-1 focus-within:shadow-[0_2px_0_0_#1e40af] active:translate-y-1 active:shadow-none"},{id:"hover-btn-border-draw",name:"Button Border Draw",nameAr:"رسم الحد",category:"button",hoverClassName:"relative border-2 border-transparent before:absolute before:inset-0 before:border-2 before:border-blue-500 before:scale-x-0 before:transition-transform before:duration-300 hover:before:scale-x-100",focusClassName:"relative border-2 border-transparent before:absolute before:inset-0 before:border-2 before:border-blue-500 before:scale-x-0 before:transition-transform before:duration-300 focus-within:before:scale-x-100"},{id:"hover-btn-shine",name:"Button Shine",nameAr:"زر لامع",category:"button",hoverClassName:"relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full",focusClassName:"relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:transition-transform before:duration-700 focus-within:before:translate-x-full"},{id:"hover-btn-ripple",name:"Button Ripple",nameAr:"زر موجة",category:"button",hoverClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-white/30 before:scale-0 before:rounded-full before:transition-transform before:duration-500 hover:before:scale-[2.5] before:opacity-0 hover:before:opacity-100",focusClassName:"relative overflow-hidden before:absolute before:inset-0 before:bg-white/30 before:scale-0 before:rounded-full before:transition-transform before:duration-500 focus-within:before:scale-[2.5] before:opacity-0 focus-within:before:opacity-100"},{id:"hover-btn-gradient-shift",name:"Button Gradient Shift",nameAr:"تحول التدرج",category:"button",hoverClassName:"bg-gradient-to-r from-blue-500 to-purple-500 bg-[length:200%_100%] bg-left transition-all duration-500 hover:bg-right",focusClassName:"bg-gradient-to-r from-blue-500 to-purple-500 bg-[length:200%_100%] bg-left transition-all duration-500 focus-within:bg-right"},{id:"hover-card-lift",name:"Card Lift",nameAr:"رفع البطاقة",category:"card",hoverClassName:"transition-all duration-300 hover:-translate-y-2 hover:shadow-xl",focusClassName:"transition-all duration-300 focus-within:-translate-y-2 focus-within:shadow-xl"},{id:"hover-card-tilt",name:"Card Tilt",nameAr:"ميلان البطاقة",category:"card",hoverClassName:"transition-transform duration-300 hover:rotate-1 hover:scale-105",focusClassName:"transition-transform duration-300 focus-within:rotate-1 focus-within:scale-105"},{id:"hover-card-3d",name:"Card 3D",nameAr:"بطاقة ثلاثية الأبعاد",category:"card",hoverClassName:"[transform-style:preserve-3d] transition-transform duration-500 hover:[transform:perspective(1000px)_rotateX(5deg)_rotateY(-5deg)]",focusClassName:"[transform-style:preserve-3d] transition-transform duration-500 focus-within:[transform:perspective(1000px)_rotateX(5deg)_rotateY(-5deg)]"},{id:"hover-card-flip",name:"Card Flip",nameAr:"قلب البطاقة",category:"card",hoverClassName:"[transform-style:preserve-3d] transition-transform duration-700 hover:[transform:rotateY(180deg)]",focusClassName:"[transform-style:preserve-3d] transition-transform duration-700 focus-within:[transform:rotateY(180deg)]"},{id:"hover-card-pop",name:"Card Pop",nameAr:"بروز البطاقة",category:"card",hoverClassName:"transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10",focusClassName:"transition-all duration-300 focus-within:scale-105 focus-within:shadow-2xl focus-within:z-10"},{id:"hover-card-float",name:"Card Float",nameAr:"طفو البطاقة",category:"card",hoverClassName:"transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]",focusClassName:"transition-all duration-500 focus-within:-translate-y-4 focus-within:shadow-[0_20px_40px_rgba(0,0,0,0.2)]"},{id:"hover-card-border-glow",name:"Card Border Glow",nameAr:"توهج حد البطاقة",category:"card",hoverClassName:"border-2 border-transparent transition-all duration-300 hover:border-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]",focusClassName:"border-2 border-transparent transition-all duration-300 focus-within:border-blue-500 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.5)]"},{id:"hover-card-reveal",name:"Card Reveal",nameAr:"كشف البطاقة",category:"card",hoverClassName:"group [&_.hidden-content]:opacity-0 [&_.hidden-content]:translate-y-4 [&_.hidden-content]:transition-all [&_.hidden-content]:duration-300 [&:hover_.hidden-content]:opacity-100 [&:hover_.hidden-content]:translate-y-0",focusClassName:"group [&_.hidden-content]:opacity-0 [&_.hidden-content]:translate-y-4 [&_.hidden-content]:transition-all [&_.hidden-content]:duration-300 [&:focus-within_.hidden-content]:opacity-100 [&:focus-within_.hidden-content]:translate-y-0"},{id:"hover-card-shine",name:"Card Shine",nameAr:"لمعان البطاقة",category:"card",hoverClassName:"relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-1000 hover:before:translate-x-full",focusClassName:"relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:transition-transform before:duration-1000 focus-within:before:translate-x-full"},{id:"hover-card-expand",name:"Card Expand",nameAr:"توسيع البطاقة",category:"card",hoverClassName:"transition-all duration-500 hover:scale-110 hover:shadow-2xl cursor-pointer",focusClassName:"transition-all duration-500 focus-within:scale-110 focus-within:shadow-2xl cursor-pointer"},{id:"hover-link-underline-grow",name:"Link Underline Grow",nameAr:"نمو الخط السفلي",category:"link",hoverClassName:"relative after:absolute after:bottom-0 after:right-0 after:h-[2px] after:w-0 after:bg-current after:transition-all after:duration-300 hover:after:w-full hover:after:right-auto hover:after:left-0",focusClassName:"relative after:absolute after:bottom-0 after:right-0 after:h-[2px] after:w-0 after:bg-current after:transition-all after:duration-300 focus-within:after:w-full focus-within:after:right-auto focus-within:after:left-0"},{id:"hover-link-underline-fade",name:"Link Underline Fade",nameAr:"تلاشي الخط السفلي",category:"link",hoverClassName:"underline underline-offset-4 decoration-transparent transition-all duration-300 hover:decoration-current",focusClassName:"underline underline-offset-4 decoration-transparent transition-all duration-300 focus-within:decoration-current"},{id:"hover-link-bracket",name:"Link Bracket",nameAr:"أقواس الرابط",category:"link",hoverClassName:"relative before:content-['['] after:content-[']'] before:opacity-0 after:opacity-0 before:transition-opacity after:transition-opacity before:duration-300 after:duration-300 hover:before:opacity-100 hover:after:opacity-100",focusClassName:"relative before:content-['['] after:content-[']'] before:opacity-0 after:opacity-0 before:transition-opacity after:transition-opacity before:duration-300 after:duration-300 focus-within:before:opacity-100 focus-within:after:opacity-100"},{id:"hover-link-arrow",name:"Link Arrow",nameAr:"سهم الرابط",category:"link",hoverClassName:"group inline-flex items-center gap-1 after:content-['→'] after:transition-transform after:duration-300 hover:after:translate-x-1",focusClassName:"group inline-flex items-center gap-1 after:content-['→'] after:transition-transform after:duration-300 focus-within:after:translate-x-1"},{id:"hover-link-background",name:"Link Background",nameAr:"خلفية الرابط",category:"link",hoverClassName:"px-1 -mx-1 transition-all duration-300 hover:bg-blue-100 hover:text-blue-600 rounded",focusClassName:"px-1 -mx-1 transition-all duration-300 focus-within:bg-blue-100 focus-within:text-blue-600 rounded"},{id:"hover-link-border-bottom",name:"Link Border Bottom",nameAr:"حد سفلي للرابط",category:"link",hoverClassName:"border-b-2 border-transparent transition-colors duration-300 hover:border-current",focusClassName:"border-b-2 border-transparent transition-colors duration-300 focus-within:border-current"},{id:"hover-link-marker",name:"Link Marker",nameAr:"علامة الرابط",category:"link",hoverClassName:"relative pl-0 transition-all duration-300 before:absolute before:right-full before:mr-1 before:content-['•'] before:opacity-0 before:transition-opacity hover:before:opacity-100 hover:pl-4",focusClassName:"relative pl-0 transition-all duration-300 before:absolute before:right-full before:mr-1 before:content-['•'] before:opacity-0 before:transition-opacity focus-within:before:opacity-100 focus-within:pl-4"},{id:"hover-link-glow",name:"Link Glow",nameAr:"توهج الرابط",category:"link",hoverClassName:"transition-all duration-300 hover:[text-shadow:0_0_10px_currentColor]",focusClassName:"transition-all duration-300 focus-within:[text-shadow:0_0_10px_currentColor]"},{id:"hover-3d-perspective",name:"3D Perspective",nameAr:"منظور ثلاثي الأبعاد",category:"3d",hoverClassName:"[transform-style:preserve-3d] transition-transform duration-500 hover:[transform:perspective(800px)_rotateY(15deg)]",focusClassName:"[transform-style:preserve-3d] transition-transform duration-500 focus-within:[transform:perspective(800px)_rotateY(15deg)]"},{id:"hover-3d-rotate-x",name:"3D Rotate X",nameAr:"دوران أفقي ثلاثي الأبعاد",category:"3d",hoverClassName:"[transform-style:preserve-3d] transition-transform duration-500 hover:[transform:perspective(800px)_rotateX(15deg)]",focusClassName:"[transform-style:preserve-3d] transition-transform duration-500 focus-within:[transform:perspective(800px)_rotateX(15deg)]"},{id:"hover-3d-rotate-y",name:"3D Rotate Y",nameAr:"دوران عمودي ثلاثي الأبعاد",category:"3d",hoverClassName:"[transform-style:preserve-3d] transition-transform duration-500 hover:[transform:perspective(800px)_rotateY(-15deg)]",focusClassName:"[transform-style:preserve-3d] transition-transform duration-500 focus-within:[transform:perspective(800px)_rotateY(-15deg)]"},{id:"hover-3d-float",name:"3D Float",nameAr:"طفو ثلاثي الأبعاد",category:"3d",hoverClassName:"[transform-style:preserve-3d] transition-all duration-500 hover:[transform:perspective(800px)_translateZ(30px)_rotateX(5deg)]",focusClassName:"[transform-style:preserve-3d] transition-all duration-500 focus-within:[transform:perspective(800px)_translateZ(30px)_rotateX(5deg)]"},{id:"hover-3d-flip-x",name:"3D Flip X",nameAr:"قلب أفقي ثلاثي الأبعاد",category:"3d",hoverClassName:"[transform-style:preserve-3d] transition-transform duration-700 hover:[transform:perspective(800px)_rotateX(180deg)]",focusClassName:"[transform-style:preserve-3d] transition-transform duration-700 focus-within:[transform:perspective(800px)_rotateX(180deg)]"},{id:"hover-3d-flip-y",name:"3D Flip Y",nameAr:"قلب عمودي ثلاثي الأبعاد",category:"3d",hoverClassName:"[transform-style:preserve-3d] transition-transform duration-700 hover:[transform:perspective(800px)_rotateY(180deg)]",focusClassName:"[transform-style:preserve-3d] transition-transform duration-700 focus-within:[transform:perspective(800px)_rotateY(180deg)]"},{id:"hover-3d-tilt",name:"3D Tilt",nameAr:"ميلان ثلاثي الأبعاد",category:"3d",hoverClassName:"[transform-style:preserve-3d] transition-transform duration-300 hover:[transform:perspective(1000px)_rotateX(5deg)_rotateY(5deg)_scale(1.02)]",focusClassName:"[transform-style:preserve-3d] transition-transform duration-300 focus-within:[transform:perspective(1000px)_rotateX(5deg)_rotateY(5deg)_scale(1.02)]"},{id:"hover-3d-shadow-layer",name:"3D Shadow Layer",nameAr:"طبقة ظل ثلاثية الأبعاد",category:"3d",hoverClassName:"relative before:absolute before:inset-0 before:bg-black/20 before:translate-x-2 before:translate-y-2 before:-z-10 before:transition-transform before:duration-300 hover:before:translate-x-4 hover:before:translate-y-4",focusClassName:"relative before:absolute before:inset-0 before:bg-black/20 before:translate-x-2 before:translate-y-2 before:-z-10 before:transition-transform before:duration-300 focus-within:before:translate-x-4 focus-within:before:translate-y-4"},{id:"hover-anim-wiggle",name:"Animation Wiggle",nameAr:"اهتزاز",category:"animation",hoverClassName:"hover:animate-[wiggle_0.3s_ease-in-out_infinite]",focusClassName:"focus-within:animate-[wiggle_0.3s_ease-in-out_infinite]"},{id:"hover-anim-jello",name:"Animation Jello",nameAr:"جيلي",category:"animation",hoverClassName:"hover:animate-[jello_0.5s_ease]",focusClassName:"focus-within:animate-[jello_0.5s_ease]"},{id:"hover-anim-heartbeat",name:"Animation Heartbeat",nameAr:"نبضة قلب",category:"animation",hoverClassName:"hover:animate-[heartbeat_0.5s_ease-in-out]",focusClassName:"focus-within:animate-[heartbeat_0.5s_ease-in-out]"},{id:"hover-anim-rubber",name:"Animation Rubber",nameAr:"مطاط",category:"animation",hoverClassName:"hover:animate-[rubber_0.4s_ease]",focusClassName:"focus-within:animate-[rubber_0.4s_ease]"},{id:"hover-anim-tada",name:"Animation Tada",nameAr:"تادا",category:"animation",hoverClassName:"hover:animate-[tada_0.5s_ease]",focusClassName:"focus-within:animate-[tada_0.5s_ease]"},{id:"hover-anim-swing",name:"Animation Swing",nameAr:"تأرجح",category:"animation",hoverClassName:"origin-top hover:animate-[swing_0.5s_ease]",focusClassName:"origin-top focus-within:animate-[swing_0.5s_ease]"}];function q(e){if(e)return k.find(a=>a.id===e)}const P={spinner:"دوارات",dots:"نقاط",bars:"أعمدة",skeleton:"هياكل",special:"خاصة",ring:"حلقات"},N="estabrek-loading";function g(e){return/^\d*\.?\d+(ms|s)$/i.test(e)}function v(e){const a=e.toLowerCase();return a==="linear"||a==="ease"||a==="ease-in"||a==="ease-out"||a==="ease-in-out"||/^steps\(/i.test(e)||/^cubic-bezier\(/i.test(e)}function w(e){const a=e.toLowerCase();return a==="infinite"||a==="normal"||a==="reverse"||a==="alternate"||a==="alternate-reverse"||a==="forwards"||a==="backwards"||a==="both"||a==="running"||a==="paused"||a==="step-start"||a==="step-end"}function A(e){const a=e.trim().split(/\s+/).filter(Boolean);for(const n of a){if(n==="none")return null;if(!g(n)&&!v(n)&&!w(n)&&!/^\d+$/.test(n))return n}return null}function m(e,a){const n=new Set,y=/@(?:-webkit-)?keyframes\s+([a-zA-Z0-9_-]+)\s*{/g;for(const o of a.matchAll(y))o[1]&&n.add(o[1]);const c=new Set,x=/animation-name\s*:\s*([^;]+);/g;for(const o of a.matchAll(x)){const t=(o[1]??"").trim();if(t)for(const i of t.split(",").map(r=>r.trim()))!i||i==="none"||c.add(i)}const C=/animation\s*:\s*([^;]+);/g;for(const o of a.matchAll(C)){const t=(o[1]??"").trim();if(t)for(const i of t.split(",").map(r=>r.trim())){const r=A(i);r&&c.add(r)}}const u=o=>`${N}-${e}-${o}`,_=new Set([...n,...c]),d=new Map([..._].map(o=>[o,u(o)]));let s=a;s=s.replace(/@keyframes\s+([a-zA-Z0-9_-]+)\s*{/g,(o,t)=>{const i=d.get(t);return i?`@keyframes ${i} {`:o}),s=s.replace(/@-webkit-keyframes\s+([a-zA-Z0-9_-]+)\s*{/g,(o,t)=>{const i=d.get(t);return i?`@-webkit-keyframes ${i} {`:o}),s=s.replace(/animation-name\s*:\s*([^;]+);/g,(o,t)=>`animation-name: ${String(t).split(",").map(r=>r.trim()).filter(Boolean).map(r=>r==="none"?r:d.get(r)??r).join(", ")};`),s=s.replace(/animation\s*:\s*([^;]+);/g,(o,t)=>`animation: ${String(t).split(",").map(r=>r.trim()).filter(Boolean).map(r=>{const h=r.split(/\s+/).filter(Boolean);if(!h.length)return r;let b=null;for(let f=0;f<h.length;f++){const l=h[f];if(l==="none"){b=null;break}if(!g(l)&&!v(l)&&!w(l)&&!/^\d+$/.test(l)){b=f;break}}if(b!==null){const f=h[b],l=d.get(f);l&&(h[b]=l)}return h.join(" ")}).join(", ")};`);const p=[];return c.has("spin")&&!n.has("spin")&&p.push(`@keyframes ${d.get("spin")??u("spin")} { to { transform: rotate(360deg); } }`),c.has("shimmer")&&!n.has("shimmer")&&p.push(`@keyframes ${d.get("shimmer")??u("shimmer")} { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`),p.length&&(s=`${p.join(`
`)}
${s}`),s}const S=[{id:"spinner-simple",name:"Simple Spinner",nameAr:"دوار بسيط",category:"spinner",html:'<div class="spinner-simple"></div>',css:`
.spinner-simple {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}`},{id:"spinner-thick",name:"Thick Spinner",nameAr:"دوار سميك",category:"spinner",html:'<div class="spinner-thick"></div>',css:`
.spinner-thick {
  width: 40px;
  height: 40px;
  border: 6px solid #e5e7eb;
  border-top-color: #8b5cf6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}`},{id:"spinner-dual",name:"Dual Ring Spinner",nameAr:"دوار مزدوج",category:"spinner",html:'<div class="spinner-dual"></div>',css:`
.spinner-dual {
  width: 40px;
  height: 40px;
  border: 4px solid transparent;
  border-top-color: #3b82f6;
  border-bottom-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}`},{id:"spinner-gradient",name:"Gradient Spinner",nameAr:"دوار متدرج",category:"spinner",html:'<div class="spinner-gradient"></div>',css:`
.spinner-gradient {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent, #3b82f6);
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px));
  animation: spin 1s linear infinite;
}`},{id:"spinner-dashed",name:"Dashed Spinner",nameAr:"دوار متقطع",category:"spinner",html:'<div class="spinner-dashed"></div>',css:`
.spinner-dashed {
  width: 40px;
  height: 40px;
  border: 4px dashed #3b82f6;
  border-radius: 50%;
  animation: spin 2s linear infinite;
}`},{id:"spinner-double",name:"Double Spinner",nameAr:"دوار ثنائي",category:"spinner",html:'<div class="spinner-double"><div></div><div></div></div>',css:`
.spinner-double {
  width: 40px;
  height: 40px;
  position: relative;
}
.spinner-double div {
  position: absolute;
  inset: 0;
  border: 4px solid transparent;
  border-radius: 50%;
}
.spinner-double div:nth-child(1) {
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
}
.spinner-double div:nth-child(2) {
  border-bottom-color: #ec4899;
  animation: spin 1s linear infinite reverse;
}`},{id:"spinner-triple",name:"Triple Spinner",nameAr:"دوار ثلاثي",category:"spinner",html:'<div class="spinner-triple"><div></div><div></div><div></div></div>',css:`
.spinner-triple {
  width: 40px;
  height: 40px;
  position: relative;
}
.spinner-triple div {
  position: absolute;
  border: 3px solid transparent;
  border-radius: 50%;
}
.spinner-triple div:nth-child(1) {
  inset: 0;
  border-top-color: #3b82f6;
  animation: spin 1s linear infinite;
}
.spinner-triple div:nth-child(2) {
  inset: 5px;
  border-right-color: #ec4899;
  animation: spin 1.5s linear infinite reverse;
}
.spinner-triple div:nth-child(3) {
  inset: 10px;
  border-bottom-color: #10b981;
  animation: spin 2s linear infinite;
}`},{id:"spinner-arc",name:"Arc Spinner",nameAr:"دوار قوسي",category:"spinner",html:'<div class="spinner-arc"></div>',css:`
.spinner-arc {
  width: 40px;
  height: 40px;
  border: 4px solid transparent;
  border-top-color: #3b82f6;
  border-right-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}`},{id:"spinner-glow",name:"Glow Spinner",nameAr:"دوار متوهج",category:"spinner",html:'<div class="spinner-glow"></div>',css:`
.spinner-glow {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
}`},{id:"spinner-neon",name:"Neon Spinner",nameAr:"دوار نيون",category:"spinner",html:'<div class="spinner-neon"></div>',css:`
.spinner-neon {
  width: 40px;
  height: 40px;
  border: 4px solid transparent;
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, inset 0 0 10px rgba(0,255,255,0.2);
}`},{id:"spinner-segmented",name:"Segmented Spinner",nameAr:"دوار مجزأ",category:"spinner",html:'<div class="spinner-segmented"><span></span><span></span><span></span><span></span></div>',css:`
.spinner-segmented {
  width: 40px;
  height: 40px;
  position: relative;
  animation: spin 1.5s linear infinite;
}
.spinner-segmented span {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
}
.spinner-segmented span:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
.spinner-segmented span:nth-child(2) { right: 0; top: 50%; transform: translateY(-50%); }
.spinner-segmented span:nth-child(3) { bottom: 0; left: 50%; transform: translateX(-50%); }
.spinner-segmented span:nth-child(4) { left: 0; top: 50%; transform: translateY(-50%); }`},{id:"spinner-orbit",name:"Orbit Spinner",nameAr:"دوار مداري",category:"spinner",html:'<div class="spinner-orbit"><div></div></div>',css:`
.spinner-orbit {
  width: 40px;
  height: 40px;
  border: 2px solid #e5e7eb;
  border-radius: 50%;
  position: relative;
}
.spinner-orbit div {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%);
  animation: orbit 1s linear infinite;
  transform-origin: 50% 25px;
}
@keyframes orbit {
  to { transform: translateX(-50%) rotate(360deg); }
}`}],B=S.map(e=>({...e,css:m(e.id,e.css)})),R=[{id:"dots-bounce",name:"Bouncing Dots",nameAr:"نقاط نطاطة",category:"dots",html:'<div class="dots-bounce"><span></span><span></span><span></span></div>',css:`
.dots-bounce {
  display: flex;
  gap: 6px;
}
.dots-bounce span {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
  animation: bounce 0.6s infinite alternate;
}
.dots-bounce span:nth-child(2) { animation-delay: 0.2s; }
.dots-bounce span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  to { transform: translateY(-10px); opacity: 0.3; }
}`},{id:"dots-pulse",name:"Pulsing Dots",nameAr:"نقاط نابضة",category:"dots",html:'<div class="dots-pulse"><span></span><span></span><span></span></div>',css:`
.dots-pulse {
  display: flex;
  gap: 6px;
}
.dots-pulse span {
  width: 10px;
  height: 10px;
  background: #8b5cf6;
  border-radius: 50%;
  animation: pulse 1s infinite ease-in-out;
}
.dots-pulse span:nth-child(2) { animation-delay: 0.2s; }
.dots-pulse span:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.5); opacity: 0.5; }
}`},{id:"dots-fade",name:"Fading Dots",nameAr:"نقاط متلاشية",category:"dots",html:'<div class="dots-fade"><span></span><span></span><span></span></div>',css:`
.dots-fade {
  display: flex;
  gap: 6px;
}
.dots-fade span {
  width: 10px;
  height: 10px;
  background: #ec4899;
  border-radius: 50%;
  animation: fade 1.2s infinite ease-in-out;
}
.dots-fade span:nth-child(2) { animation-delay: 0.2s; }
.dots-fade span:nth-child(3) { animation-delay: 0.4s; }
@keyframes fade {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}`},{id:"dots-wave",name:"Wave Dots",nameAr:"نقاط موجية",category:"dots",html:'<div class="dots-wave"><span></span><span></span><span></span><span></span><span></span></div>',css:`
.dots-wave {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 30px;
}
.dots-wave span {
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
  animation: wave 1s infinite ease-in-out;
}
.dots-wave span:nth-child(2) { animation-delay: 0.1s; }
.dots-wave span:nth-child(3) { animation-delay: 0.2s; }
.dots-wave span:nth-child(4) { animation-delay: 0.3s; }
.dots-wave span:nth-child(5) { animation-delay: 0.4s; }
@keyframes wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}`},{id:"dots-typing",name:"Typing Dots",nameAr:"نقاط كتابة",category:"dots",html:'<div class="dots-typing"><span></span><span></span><span></span></div>',css:`
.dots-typing {
  display: flex;
  gap: 4px;
  padding: 10px 15px;
  background: #f3f4f6;
  border-radius: 20px;
}
.dots-typing span {
  width: 8px;
  height: 8px;
  background: #6b7280;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}
.dots-typing span:nth-child(2) { animation-delay: 0.2s; }
.dots-typing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-8px); }
}`},{id:"dots-elastic",name:"Elastic Dots",nameAr:"نقاط مرنة",category:"dots",html:'<div class="dots-elastic"><span></span><span></span><span></span></div>',css:`
.dots-elastic {
  display: flex;
  gap: 6px;
}
.dots-elastic span {
  width: 10px;
  height: 10px;
  background: #10b981;
  border-radius: 50%;
  animation: elastic 0.8s infinite;
}
.dots-elastic span:nth-child(2) { animation-delay: 0.1s; }
.dots-elastic span:nth-child(3) { animation-delay: 0.2s; }
@keyframes elastic {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.5); }
}`},{id:"dots-circular",name:"Circular Dots",nameAr:"نقاط دائرية",category:"dots",html:'<div class="dots-circular"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>',css:`
.dots-circular {
  width: 40px;
  height: 40px;
  position: relative;
}
.dots-circular span {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #3b82f6;
  border-radius: 50%;
  animation: circular-fade 1.2s infinite;
}
.dots-circular span:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
.dots-circular span:nth-child(2) { top: 6px; right: 6px; animation-delay: 0.15s; }
.dots-circular span:nth-child(3) { right: 0; top: 50%; transform: translateY(-50%); animation-delay: 0.3s; }
.dots-circular span:nth-child(4) { bottom: 6px; right: 6px; animation-delay: 0.45s; }
.dots-circular span:nth-child(5) { bottom: 0; left: 50%; transform: translateX(-50%); animation-delay: 0.6s; }
.dots-circular span:nth-child(6) { bottom: 6px; left: 6px; animation-delay: 0.75s; }
.dots-circular span:nth-child(7) { left: 0; top: 50%; transform: translateY(-50%); animation-delay: 0.9s; }
.dots-circular span:nth-child(8) { top: 6px; left: 6px; animation-delay: 1.05s; }
@keyframes circular-fade {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}`},{id:"dots-flipping",name:"Flipping Dots",nameAr:"نقاط منقلبة",category:"dots",html:'<div class="dots-flipping"><span></span><span></span><span></span></div>',css:`
.dots-flipping {
  display: flex;
  gap: 6px;
}
.dots-flipping span {
  width: 10px;
  height: 10px;
  background: #f59e0b;
  border-radius: 50%;
  animation: flip 1s infinite;
}
.dots-flipping span:nth-child(2) { animation-delay: 0.2s; }
.dots-flipping span:nth-child(3) { animation-delay: 0.4s; }
@keyframes flip {
  0%, 100% { transform: rotateY(0); }
  50% { transform: rotateY(180deg); background: #ef4444; }
}`},{id:"dots-growing",name:"Growing Dots",nameAr:"نقاط نامية",category:"dots",html:'<div class="dots-growing"><span></span><span></span><span></span></div>',css:`
.dots-growing {
  display: flex;
  gap: 8px;
  align-items: center;
}
.dots-growing span {
  width: 8px;
  height: 8px;
  background: #6366f1;
  border-radius: 50%;
  animation: grow 1s infinite;
}
.dots-growing span:nth-child(2) { animation-delay: 0.2s; }
.dots-growing span:nth-child(3) { animation-delay: 0.4s; }
@keyframes grow {
  0%, 100% { transform: scale(0.5); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
}`},{id:"dots-square",name:"Square Dots",nameAr:"نقاط مربعة",category:"dots",html:'<div class="dots-square"><span></span><span></span><span></span><span></span></div>',css:`
.dots-square {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
  width: 30px;
  height: 30px;
}
.dots-square span {
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 2px;
  animation: square-pulse 1.2s infinite;
}
.dots-square span:nth-child(2) { animation-delay: 0.2s; }
.dots-square span:nth-child(3) { animation-delay: 0.4s; }
.dots-square span:nth-child(4) { animation-delay: 0.6s; }
@keyframes square-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.8); }
}`}],z=R.map(e=>({...e,css:m(e.id,e.css)})),D=[{id:"bars-wave",name:"Wave Bars",nameAr:"أعمدة موجية",category:"bars",html:'<div class="bars-wave"><span></span><span></span><span></span><span></span><span></span></div>',css:`
.bars-wave {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 40px;
}
.bars-wave span {
  width: 6px;
  height: 20px;
  background: #3b82f6;
  border-radius: 3px;
  animation: bars-wave 1s infinite ease-in-out;
}
.bars-wave span:nth-child(2) { animation-delay: 0.1s; }
.bars-wave span:nth-child(3) { animation-delay: 0.2s; }
.bars-wave span:nth-child(4) { animation-delay: 0.3s; }
.bars-wave span:nth-child(5) { animation-delay: 0.4s; }
@keyframes bars-wave {
  0%, 100% { height: 20px; }
  50% { height: 40px; }
}`},{id:"bars-equalizer",name:"Equalizer Bars",nameAr:"أعمدة معادل الصوت",category:"bars",html:'<div class="bars-equalizer"><span></span><span></span><span></span><span></span></div>',css:`
.bars-equalizer {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 40px;
}
.bars-equalizer span {
  width: 8px;
  background: linear-gradient(to top, #3b82f6, #8b5cf6);
  border-radius: 2px;
  animation: equalizer 0.8s infinite ease-in-out;
}
.bars-equalizer span:nth-child(1) { animation-duration: 0.7s; }
.bars-equalizer span:nth-child(2) { animation-duration: 0.5s; }
.bars-equalizer span:nth-child(3) { animation-duration: 0.9s; }
.bars-equalizer span:nth-child(4) { animation-duration: 0.6s; }
@keyframes equalizer {
  0%, 100% { height: 10px; }
  50% { height: 40px; }
}`},{id:"bars-loading",name:"Loading Bars",nameAr:"أعمدة تحميل",category:"bars",html:'<div class="bars-loading"><span></span><span></span><span></span></div>',css:`
.bars-loading {
  display: flex;
  gap: 4px;
}
.bars-loading span {
  width: 8px;
  height: 30px;
  background: #10b981;
  border-radius: 4px;
  animation: loading-bars 1s infinite;
}
.bars-loading span:nth-child(2) { animation-delay: 0.2s; }
.bars-loading span:nth-child(3) { animation-delay: 0.4s; }
@keyframes loading-bars {
  0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
  50% { transform: scaleY(1); opacity: 1; }
}`},{id:"bars-flip",name:"Flip Bars",nameAr:"أعمدة منقلبة",category:"bars",html:'<div class="bars-flip"><span></span><span></span><span></span></div>',css:`
.bars-flip {
  display: flex;
  gap: 4px;
}
.bars-flip span {
  width: 10px;
  height: 30px;
  background: #f59e0b;
  animation: flip-bars 1.2s infinite;
}
.bars-flip span:nth-child(2) { animation-delay: 0.2s; }
.bars-flip span:nth-child(3) { animation-delay: 0.4s; }
@keyframes flip-bars {
  0%, 100% { transform: rotateX(0); }
  50% { transform: rotateX(180deg); }
}`},{id:"bars-progress",name:"Progress Bars",nameAr:"أعمدة تقدم",category:"bars",html:'<div class="bars-progress"><span></span><span></span><span></span><span></span><span></span></div>',css:`
.bars-progress {
  display: flex;
  gap: 3px;
}
.bars-progress span {
  width: 6px;
  height: 25px;
  background: #e5e7eb;
  border-radius: 3px;
  animation: progress-bars 1.5s infinite;
}
.bars-progress span:nth-child(1) { animation-delay: 0s; }
.bars-progress span:nth-child(2) { animation-delay: 0.2s; }
.bars-progress span:nth-child(3) { animation-delay: 0.4s; }
.bars-progress span:nth-child(4) { animation-delay: 0.6s; }
.bars-progress span:nth-child(5) { animation-delay: 0.8s; }
@keyframes progress-bars {
  0%, 100% { background: #e5e7eb; }
  50% { background: #3b82f6; }
}`},{id:"bars-gradient",name:"Gradient Bars",nameAr:"أعمدة متدرجة",category:"bars",html:'<div class="bars-gradient"><span></span><span></span><span></span><span></span></div>',css:`
.bars-gradient {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 40px;
}
.bars-gradient span {
  width: 8px;
  background: linear-gradient(to top, #ec4899, #8b5cf6, #3b82f6);
  border-radius: 4px;
  animation: gradient-bars 1s infinite;
}
.bars-gradient span:nth-child(1) { animation-delay: 0s; height: 15px; }
.bars-gradient span:nth-child(2) { animation-delay: 0.15s; height: 20px; }
.bars-gradient span:nth-child(3) { animation-delay: 0.3s; height: 25px; }
.bars-gradient span:nth-child(4) { animation-delay: 0.45s; height: 20px; }
@keyframes gradient-bars {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
}`},{id:"bars-slide",name:"Sliding Bars",nameAr:"أعمدة منزلقة",category:"bars",html:'<div class="bars-slide"><span></span></div>',css:`
.bars-slide {
  width: 60px;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}
.bars-slide span {
  display: block;
  width: 30px;
  height: 100%;
  background: #3b82f6;
  border-radius: 3px;
  animation: slide-bar 1s infinite ease-in-out;
}
@keyframes slide-bar {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}`},{id:"bars-fill",name:"Fill Bar",nameAr:"عمود ملء",category:"bars",html:'<div class="bars-fill"><span></span></div>',css:`
.bars-fill {
  width: 80px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}
.bars-fill span {
  display: block;
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  animation: fill-bar 2s infinite;
}
@keyframes fill-bar {
  0% { width: 0%; }
  50% { width: 100%; }
  100% { width: 0%; }
}`},{id:"bars-bounce",name:"Bouncing Bars",nameAr:"أعمدة نطاطة",category:"bars",html:'<div class="bars-bounce"><span></span><span></span><span></span></div>',css:`
.bars-bounce {
  display: flex;
  gap: 5px;
  align-items: flex-end;
  height: 40px;
}
.bars-bounce span {
  width: 10px;
  height: 10px;
  background: #6366f1;
  border-radius: 2px;
  animation: bounce-bar 0.6s infinite alternate;
}
.bars-bounce span:nth-child(2) { animation-delay: 0.2s; }
.bars-bounce span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce-bar {
  to { height: 40px; }
}`},{id:"bars-rotate",name:"Rotating Bars",nameAr:"أعمدة دوارة",category:"bars",html:'<div class="bars-rotate"><span></span><span></span><span></span><span></span></div>',css:`
.bars-rotate {
  width: 40px;
  height: 40px;
  position: relative;
  animation: spin 2s linear infinite;
}
.bars-rotate span {
  position: absolute;
  width: 6px;
  height: 16px;
  background: #3b82f6;
  border-radius: 3px;
  left: 50%;
  transform: translateX(-50%);
}
.bars-rotate span:nth-child(1) { top: 0; opacity: 1; }
.bars-rotate span:nth-child(2) { bottom: 0; opacity: 0.7; }
.bars-rotate span:nth-child(3) { top: 50%; left: 0; transform: translateY(-50%) rotate(90deg); opacity: 0.5; }
.bars-rotate span:nth-child(4) { top: 50%; right: 0; left: auto; transform: translateY(-50%) rotate(90deg); opacity: 0.3; }`}],L=D.map(e=>({...e,css:m(e.id,e.css)})),Y=[{id:"skeleton-text",name:"Skeleton Text",nameAr:"هيكل نص",category:"skeleton",html:'<div class="skeleton-text"><div></div><div></div><div></div></div>',css:`
.skeleton-text div {
  height: 12px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}
.skeleton-text div:nth-child(1) { width: 100%; }
.skeleton-text div:nth-child(2) { width: 80%; }
.skeleton-text div:nth-child(3) { width: 60%; }
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`},{id:"skeleton-card",name:"Skeleton Card",nameAr:"هيكل بطاقة",category:"skeleton",html:'<div class="skeleton-card"><div class="img"></div><div class="text"></div><div class="text short"></div></div>',css:`
.skeleton-card {
  width: 200px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.skeleton-card .img {
  width: 100%;
  height: 120px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}
.skeleton-card .text {
  height: 12px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}
.skeleton-card .text.short { width: 60%; }`},{id:"skeleton-avatar",name:"Skeleton Avatar",nameAr:"هيكل صورة",category:"skeleton",html:'<div class="skeleton-avatar"><div class="circle"></div><div class="lines"><div></div><div></div></div></div>',css:`
.skeleton-avatar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.skeleton-avatar .circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-avatar .lines div {
  height: 10px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 6px;
}
.skeleton-avatar .lines div:first-child { width: 120px; }
.skeleton-avatar .lines div:last-child { width: 80px; }`},{id:"skeleton-image",name:"Skeleton Image",nameAr:"هيكل صورة",category:"skeleton",html:'<div class="skeleton-image"></div>',css:`
.skeleton-image {
  width: 100%;
  height: 200px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  position: relative;
}
.skeleton-image::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: #d1d5db;
  border-radius: 4px;
}`},{id:"skeleton-list",name:"Skeleton List",nameAr:"هيكل قائمة",category:"skeleton",html:'<div class="skeleton-list"><div class="item"><div class="circle"></div><div class="line"></div></div><div class="item"><div class="circle"></div><div class="line"></div></div><div class="item"><div class="circle"></div><div class="line"></div></div></div>',css:`
.skeleton-list .item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}
.skeleton-list .circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}
.skeleton-list .line {
  flex: 1;
  height: 12px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}`},{id:"skeleton-table",name:"Skeleton Table",nameAr:"هيكل جدول",category:"skeleton",html:'<div class="skeleton-table"><div class="row header"><span></span><span></span><span></span></div><div class="row"><span></span><span></span><span></span></div><div class="row"><span></span><span></span><span></span></div></div>',css:`
.skeleton-table .row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}
.skeleton-table .row.header { border-bottom: 2px solid #e5e7eb; }
.skeleton-table span {
  flex: 1;
  height: 12px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}`},{id:"skeleton-button",name:"Skeleton Button",nameAr:"هيكل زر",category:"skeleton",html:'<div class="skeleton-button"></div>',css:`
.skeleton-button {
  width: 120px;
  height: 40px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}`},{id:"skeleton-paragraph",name:"Skeleton Paragraph",nameAr:"هيكل فقرة",category:"skeleton",html:'<div class="skeleton-paragraph"><div></div><div></div><div></div><div></div><div></div></div>',css:`
.skeleton-paragraph div {
  height: 10px;
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}
.skeleton-paragraph div:nth-child(1) { width: 100%; }
.skeleton-paragraph div:nth-child(2) { width: 95%; }
.skeleton-paragraph div:nth-child(3) { width: 100%; }
.skeleton-paragraph div:nth-child(4) { width: 90%; }
.skeleton-paragraph div:nth-child(5) { width: 70%; }`}],O=Y.map(e=>({...e,css:m(e.id,e.css)})),T=[{id:"loader-ripple",name:"Ripple",nameAr:"تموج",category:"special",html:'<div class="loader-ripple"><div></div><div></div></div>',css:`
.loader-ripple {
  width: 40px;
  height: 40px;
  position: relative;
}
.loader-ripple div {
  position: absolute;
  inset: 0;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ripple 1.5s infinite ease-out;
}
.loader-ripple div:nth-child(2) { animation-delay: 0.5s; }
@keyframes ripple {
  0% { transform: scale(0); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}`},{id:"loader-heartbeat",name:"Heartbeat",nameAr:"نبضة قلب",category:"special",html:'<div class="loader-heartbeat">❤</div>',css:`
.loader-heartbeat {
  font-size: 40px;
  color: #ef4444;
  animation: heartbeat 1s infinite;
}
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.2); }
  50% { transform: scale(1); }
  75% { transform: scale(1.2); }
}`},{id:"loader-cube",name:"3D Cube",nameAr:"مكعب ثلاثي الأبعاد",category:"special",html:'<div class="loader-cube"><div></div></div>',css:`
.loader-cube {
  width: 40px;
  height: 40px;
  perspective: 100px;
}
.loader-cube div {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  animation: cube 1.2s infinite ease-in-out;
}
@keyframes cube {
  0% { transform: rotateX(0) rotateY(0); }
  25% { transform: rotateX(180deg) rotateY(0); }
  50% { transform: rotateX(180deg) rotateY(180deg); }
  75% { transform: rotateX(0) rotateY(180deg); }
  100% { transform: rotateX(0) rotateY(0); }
}`},{id:"loader-infinity",name:"Infinity",nameAr:"لانهاية",category:"special",html:'<div class="loader-infinity"><div></div><div></div></div>',css:`
.loader-infinity {
  width: 60px;
  height: 30px;
  position: relative;
}
.loader-infinity div {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid #3b82f6;
  border-radius: 50%;
  animation: infinity 2s infinite;
}
.loader-infinity div:nth-child(1) { left: 0; animation-direction: normal; }
.loader-infinity div:nth-child(2) { right: 0; animation-direction: reverse; }
@keyframes infinity {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(40px); }
}`},{id:"loader-hourglass",name:"Hourglass",nameAr:"ساعة رملية",category:"special",html:'<div class="loader-hourglass">⏳</div>',css:`
.loader-hourglass {
  font-size: 40px;
  animation: hourglass 2s infinite;
}
@keyframes hourglass {
  0% { transform: rotate(0); }
  50% { transform: rotate(180deg); }
  100% { transform: rotate(180deg); }
}`},{id:"loader-dna",name:"DNA Helix",nameAr:"حلزون الحمض النووي",category:"special",html:'<div class="loader-dna"><span></span><span></span><span></span><span></span><span></span></div>',css:`
.loader-dna {
  display: flex;
  gap: 5px;
  align-items: center;
  height: 40px;
}
.loader-dna span {
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  animation: dna 1s infinite ease-in-out;
}
.loader-dna span:nth-child(1) { animation-delay: 0s; }
.loader-dna span:nth-child(2) { animation-delay: 0.1s; }
.loader-dna span:nth-child(3) { animation-delay: 0.2s; }
.loader-dna span:nth-child(4) { animation-delay: 0.3s; }
.loader-dna span:nth-child(5) { animation-delay: 0.4s; }
@keyframes dna {
  0%, 100% { transform: translateY(-15px); background: #3b82f6; }
  50% { transform: translateY(15px); background: #ec4899; }
}`},{id:"loader-orbit-dots",name:"Orbit Dots",nameAr:"نقاط مدارية",category:"special",html:'<div class="loader-orbit-dots"><span></span><span></span></div>',css:`
.loader-orbit-dots {
  width: 50px;
  height: 50px;
  position: relative;
  animation: spin 2s linear infinite;
}
.loader-orbit-dots span {
  position: absolute;
  width: 12px;
  height: 12px;
  background: #3b82f6;
  border-radius: 50%;
}
.loader-orbit-dots span:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
.loader-orbit-dots span:nth-child(2) { bottom: 0; left: 50%; transform: translateX(-50%); background: #ec4899; }`},{id:"loader-atom",name:"Atom",nameAr:"ذرة",category:"special",html:'<div class="loader-atom"><div class="nucleus"></div><div class="orbit o1"></div><div class="orbit o2"></div><div class="orbit o3"></div></div>',css:`
.loader-atom {
  width: 50px;
  height: 50px;
  position: relative;
}
.loader-atom .nucleus {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
}
.loader-atom .orbit {
  position: absolute;
  inset: 0;
  border: 2px solid transparent;
  border-top-color: #3b82f6;
  border-radius: 50%;
}
.loader-atom .o1 { animation: spin 1s linear infinite; }
.loader-atom .o2 { animation: spin 1.5s linear infinite; transform: rotate(60deg); }
.loader-atom .o3 { animation: spin 2s linear infinite; transform: rotate(120deg); }`},{id:"loader-clock",name:"Clock",nameAr:"ساعة",category:"special",html:'<div class="loader-clock"><div class="hand"></div><div class="hand minute"></div></div>',css:`
.loader-clock {
  width: 40px;
  height: 40px;
  border: 3px solid #3b82f6;
  border-radius: 50%;
  position: relative;
}
.loader-clock .hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  width: 2px;
  height: 35%;
  background: #3b82f6;
  transform-origin: bottom center;
  animation: clock-hour 12s linear infinite;
}
.loader-clock .hand.minute {
  height: 45%;
  animation: clock-minute 1s linear infinite;
}
@keyframes clock-hour {
  to { transform: rotate(360deg); }
}
@keyframes clock-minute {
  to { transform: rotate(360deg); }
}`},{id:"loader-wifi",name:"WiFi",nameAr:"واي فاي",category:"special",html:'<div class="loader-wifi"><span></span><span></span><span></span></div>',css:`
.loader-wifi {
  width: 40px;
  height: 40px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.loader-wifi span {
  position: absolute;
  border: 3px solid transparent;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: wifi 1.5s infinite;
}
.loader-wifi span:nth-child(1) { width: 15px; height: 15px; bottom: 0; animation-delay: 0s; }
.loader-wifi span:nth-child(2) { width: 25px; height: 25px; bottom: 0; animation-delay: 0.3s; }
.loader-wifi span:nth-child(3) { width: 35px; height: 35px; bottom: 0; animation-delay: 0.6s; }
@keyframes wifi {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}`},{id:"loader-battery",name:"Battery",nameAr:"بطارية",category:"special",html:'<div class="loader-battery"><div class="level"></div></div>',css:`
.loader-battery {
  width: 50px;
  height: 24px;
  border: 3px solid #3b82f6;
  border-radius: 4px;
  position: relative;
  padding: 2px;
}
.loader-battery::after {
  content: "";
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 10px;
  background: #3b82f6;
  border-radius: 0 2px 2px 0;
}
.loader-battery .level {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  animation: battery 2s infinite;
}
@keyframes battery {
  0% { width: 0%; }
  100% { width: 100%; }
}`},{id:"loader-pacman",name:"Pacman",nameAr:"باك مان",category:"special",html:'<div class="loader-pacman"><div class="pacman"></div><div class="dots"><span></span><span></span><span></span></div></div>',css:`
.loader-pacman {
  display: flex;
  align-items: center;
  gap: 5px;
}
.loader-pacman .pacman {
  width: 30px;
  height: 30px;
  background: #facc15;
  border-radius: 50%;
  position: relative;
  animation: pacman 0.5s infinite;
}
.loader-pacman .pacman::before {
  content: "";
  position: absolute;
  top: 5px;
  right: 12px;
  width: 5px;
  height: 5px;
  background: #000;
  border-radius: 50%;
}
.loader-pacman .dots {
  display: flex;
  gap: 5px;
}
.loader-pacman .dots span {
  width: 8px;
  height: 8px;
  background: #facc15;
  border-radius: 50%;
  animation: pacman-dots 0.5s infinite;
}
.loader-pacman .dots span:nth-child(2) { animation-delay: 0.1s; }
.loader-pacman .dots span:nth-child(3) { animation-delay: 0.2s; }
@keyframes pacman {
  0%, 100% { clip-path: polygon(100% 0, 100% 100%, 50% 50%, 100% 0); }
  50% { clip-path: polygon(100% 50%, 100% 50%, 50% 50%, 100% 50%); }
}
@keyframes pacman-dots {
  0%, 100% { opacity: 1; transform: translateX(0); }
  50% { opacity: 0; transform: translateX(-10px); }
}`}],E=T.map(e=>({...e,css:m(e.id,e.css)})),I=[{id:"ring-chase",name:"Ring Chase",nameAr:"حلقة مطاردة",category:"ring",html:'<div class="ring-chase"><div></div><div></div><div></div></div>',css:`
.ring-chase {
  width: 40px;
  height: 40px;
  position: relative;
}
.ring-chase div {
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: ring-chase 1.5s infinite;
}
.ring-chase div:nth-child(2) { animation-delay: 0.2s; inset: 4px; }
.ring-chase div:nth-child(3) { animation-delay: 0.4s; inset: 8px; }
@keyframes ring-chase {
  0% { transform: rotate(0); }
  100% { transform: rotate(360deg); }
}`},{id:"ring-scale",name:"Ring Scale",nameAr:"حلقة متغيرة الحجم",category:"ring",html:'<div class="ring-scale"></div>',css:`
.ring-scale {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ring-scale 1s infinite;
}
@keyframes ring-scale {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.5; }
}`},{id:"ring-bounce",name:"Ring Bounce",nameAr:"حلقة نطاطة",category:"ring",html:'<div class="ring-bounce"></div>',css:`
.ring-bounce {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ring-bounce 0.6s infinite alternate;
}
@keyframes ring-bounce {
  to { transform: translateY(-15px); }
}`},{id:"ring-morph",name:"Ring Morph",nameAr:"حلقة متحولة",category:"ring",html:'<div class="ring-morph"></div>',css:`
.ring-morph {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  animation: ring-morph 1.5s infinite;
}
@keyframes ring-morph {
  0%, 100% { border-radius: 50%; }
  25% { border-radius: 50% 0 50% 0; }
  50% { border-radius: 0; }
  75% { border-radius: 0 50% 0 50%; }
}`},{id:"ring-fade",name:"Ring Fade",nameAr:"حلقة متلاشية",category:"ring",html:'<div class="ring-fade"><div></div><div></div><div></div></div>',css:`
.ring-fade {
  width: 40px;
  height: 40px;
  position: relative;
}
.ring-fade div {
  position: absolute;
  inset: 0;
  border: 3px solid #3b82f6;
  border-radius: 50%;
  animation: ring-fade 1.5s infinite;
}
.ring-fade div:nth-child(2) { animation-delay: 0.5s; }
.ring-fade div:nth-child(3) { animation-delay: 1s; }
@keyframes ring-fade {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}`},{id:"ring-pulse",name:"Ring Pulse",nameAr:"حلقة نابضة",category:"ring",html:'<div class="ring-pulse"></div>',css:`
.ring-pulse {
  width: 40px;
  height: 40px;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ring-pulse 1s infinite;
  box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
}
@keyframes ring-pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
  100% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
}`},{id:"ring-dash",name:"Ring Dash",nameAr:"حلقة متقطعة",category:"ring",html:'<svg class="ring-dash" viewBox="0 0 50 50"><circle cx="25" cy="25" r="20"></circle></svg>',css:`
.ring-dash {
  width: 40px;
  height: 40px;
  animation: spin 2s linear infinite;
}
.ring-dash circle {
  fill: none;
  stroke: #3b82f6;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 75;
}`},{id:"ring-double-bounce",name:"Ring Double Bounce",nameAr:"حلقة نطاطة مزدوجة",category:"ring",html:'<div class="ring-double-bounce"><div></div><div></div></div>',css:`
.ring-double-bounce {
  width: 40px;
  height: 40px;
  position: relative;
}
.ring-double-bounce div {
  position: absolute;
  inset: 0;
  border: 4px solid #3b82f6;
  border-radius: 50%;
  animation: double-bounce 2s infinite ease-in-out;
}
.ring-double-bounce div:nth-child(2) {
  animation-delay: -1s;
}
@keyframes double-bounce {
  0%, 100% { transform: scale(0); }
  50% { transform: scale(1); }
}`}],X=I.map(e=>({...e,css:m(e.id,e.css)})),G=[...B,...z,...L,...O,...E,...X];function $(e){return G.find(a=>a.id===e)}export{G as A,k as I,P as L,F as a,$ as b,q as g};

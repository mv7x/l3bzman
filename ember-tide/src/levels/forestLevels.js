// =========================================================
// Ember & Tide - Forest Temple Campaign
// 32 compact, single-screen co-op chambers.
// Layouts follow the original game's progression philosophy:
// tutorial -> switches -> boxes -> timing -> symmetric rooms -> finales.
// All geometry is original; no proprietary level data or artwork is copied.
// =========================================================

const W = 1280;
const H = 720;
const FLOOR_Y = 660;

const p = (x, y, width, height = 22) => ({ x, y, width, height, solid: true });
const hazard = (type, x, y, width, height = 18) => ({ type, x, y, width, height });
const plate = (id, x, y, targetIds, color = '#ef4444', latch = false) => ({ id, x, y, width: 42, height: 8, targetIds, color, isLatching: latch });
const door = (id, x, y, height = 72, color = '#ef4444') => ({ id, x, y, width: 18, height, openDirection: 'up', defaultOpen: false, color });
const lever = (id, x, y, targetIds) => ({ id, x, y, width: 26, height: 30, targetIds, defaultState: false });
const border = () => [p(0, 0, W, 24), p(0, 0, 24, H), p(W - 24, 0, 24, H)];
const floor = (...parts) => parts.map(([x, w]) => p(x, FLOOR_Y, w, H - FLOOR_Y));

const layouts = [
  { platforms: [...floor([24,360],[520,250],[930,326]),p(150,535,220),p(450,455,250),p(760,535,220),p(1010,455,180)], hazards:[hazard('lava',384,642,120),hazard('water',770,642,130)], ember:[72,618],tide:[112,618],goals:[[1080,598],[1150,598]] },
  { platforms: [...floor([24,300],[440,180],[760,496]),p(100,525,250),p(430,525,250),p(760,525,180),p(1010,525,180),p(300,405,300),p(700,405,300),p(500,285,280)], hazards:[hazard('lava',324,642,110),hazard('water',630,642,110),hazard('acid',900,642,110)], ember:[60,618],tide:[105,618],goals:[[1050,463],[1110,463]],plateData:[[330,517,'d1'],[690,517,'d1']],doorData:[['d1',625,588]] },
  { platforms:[...floor([24,220],[1060,196]),p(120,520,220),p(410,520,220),p(700,520,220),p(990,520,170),p(300,390,210),p(650,390,210),p(900,300,220)], hazards:[hazard('acid',245,642,180),hazard('acid',635,642,160),hazard('acid',930,642,130)], ember:[70,618],tide:[110,618],goals:[[1010,238],[1070,238]] },
  { platforms:[...floor([24,220],[430,180],[780,476]),p(120,520,260),p(480,520,250),p(830,520,250),p(380,390,300),p(730,330,300)], hazards:[hazard('lava',250,642,170),hazard('water',650,642,130)], ember:[60,618],tide:[100,618],goals:[[960,288],[1020,288]] },
  { platforms:[...floor([24,300],[500,180],[820,436]),p(140,520,250),p(430,520,240),p(760,520,240),p(970,390,210),p(600,365,250)], hazards:[hazard('lava',330,642,150),hazard('water',680,642,140)], ember:[60,618],tide:[105,618],goals:[[1010,328],[1070,328]],boxData:[[390,622]],leverData:[[910,485,'d5']],doorData:[['d5',840,448]] },
  { platforms:[...floor([24,180],[400,480],[1080,176]),p(90,525,260),p(420,525,420),p(900,525,250),p(270,380,260),p(720,380,260)], hazards:[hazard('water',210,642,180),hazard('lava',900,642,180)], ember:[60,618],tide:[100,618],goals:[[1000,463],[1060,463]] },
  { platforms:[...floor([24,320],[500,220],[850,406]),p(130,525,240),p(390,455,240),p(650,385,240),p(910,315,240),p(760,205,220)], hazards:[hazard('lava',350,642,140),hazard('water',720,642,110)], ember:[60,618],tide:[105,618],goals:[[810,143],[870,143]] },
  { platforms:[...floor([24,220],[520,240],[1000,256]),p(80,525,210),p(370,455,210),p(670,525,210),p(960,455,210),p(470,330,330)], hazards:[hazard('water',250,642,250),hazard('lava',770,642,220)], ember:[60,618],tide:[100,618],goals:[[1020,393],[1080,393]] },
  { platforms:[...floor([24,330],[520,240],[900,356]),p(110,515,250),p(920,515,250),p(350,400,580),p(500,280,280)], hazards:[hazard('lava',370,642,140),hazard('water',760,642,120)], ember:[60,618],tide:[105,618],goals:[[580,218],[640,218]],leverData:[[1040,470,'d9']],doorData:[['d9',650,338]] },
  { platforms:[...floor([24,260],[500,280],[1020,236]),p(90,515,270),p(920,515,270),p(280,380,300),p(700,380,300),p(500,250,280)], hazards:[hazard('lava',285,642,180),hazard('water',800,642,170)], ember:[60,618],tide:[105,618],goals:[[540,188],[600,188]] },
  { platforms:[...floor([24,500],[650,100],[820,436]),p(100,520,260),p(920,520,260),p(390,445,500),p(500,315,280),p(740,315,280),p(500,185,280)], hazards:[hazard('lava',530,642,110),hazard('water',650,642,110)], ember:[60,618],tide:[105,618],goals:[[580,123],[640,123]] },
  { platforms:[...floor([24,250],[1010,246]),p(100,520,250),p(930,520,250),p(330,450,620),p(500,320,280),p(740,320,280),p(600,195,180)], hazards:[hazard('acid',274,642,740),hazard('lava',470,428,100),hazard('water',710,428,100)], ember:[60,618],tide:[105,618],goals:[[625,133],[685,133]] },
  { platforms:[...floor([24,230],[430,190],[740,516]),p(100,525,260),p(420,455,250),p(730,385,250),p(950,315,200),p(570,245,260)], hazards:[hazard('water',254,642,140),hazard('lava',620,642,100)], ember:[60,618],tide:[105,618],goals:[[620,183],[680,183]] },
  { platforms:[...floor([24,280],[500,220],[860,396]),p(100,525,280),p(900,525,250),p(300,405,680),p(470,285,340),p(560,165,220)], hazards:[hazard('lava',310,642,150),hazard('water',720,642,120),hazard('acid',600,407,180)], ember:[60,618],tide:[105,618],goals:[[590,103],[650,103]] },
  { platforms:[...floor([24,300],[470,340],[950,306]),p(100,520,1080),p(300,400,240),p(740,400,240),p(500,280,300)], hazards:[hazard('water',325,642,120),hazard('lava',790,642,120),hazard('acid',520,642,180)], ember:[60,618],tide:[105,618],goals:[[560,218],[620,218]],plateData:[[260,512,'d15'],[1000,512,'d15']],doorData:[['d15',630,448]] },
  { platforms:[...floor([24,250],[1010,246]),p(110,540,260),p(910,540,260),p(300,440,680),p(420,335,450),p(590,230,250),p(690,135,230)], hazards:[hazard('lava',275,642,130),hazard('water',760,642,130),hazard('acid',300,462,160)], ember:[60,618],tide:[105,618],goals:[[720,73],[780,73]] },
  { platforms:[...floor([24,240],[430,190],[730,526]),p(100,525,260),p(920,525,260),p(250,400,260),p(770,400,260),p(420,285,440),p(540,170,220)], hazards:[hazard('lava',275,642,120),hazard('water',650,642,110),hazard('acid',520,187,110)], ember:[60,618],tide:[105,618],goals:[[555,108],[615,108]] },
  { platforms:[...floor([24,280],[500,200],[900,356]),p(100,520,240),p(940,520,240),p(280,410,220),p(780,410,220),p(430,300,420),p(520,190,240)], hazards:[hazard('lava',300,642,160),hazard('water',780,642,120)], ember:[60,618],tide:[105,618],goals:[[540,128],[600,128]] },
  { platforms:[...floor([24,300],[480,320],[940,316]),p(100,520,250),p(930,520,250),p(260,410,230),p(790,410,230),p(410,300,460),p(520,190,240)], hazards:[hazard('water',325,642,120),hazard('lava',690,642,140),hazard('acid',555,308,170)], ember:[60,618],tide:[105,618],goals:[[545,128],[605,128]] },
  { platforms:[...floor([24,330],[520,180],[800,456]),p(110,520,260),p(910,520,240),p(300,400,220),p(760,400,220),p(420,290,440),p(520,175,240)], hazards:[hazard('lava',355,642,120),hazard('water',680,642,110)], ember:[60,618],tide:[105,618],goals:[[540,113],[600,113]] },
  { platforms:[...floor([24,220],[390,250],[900,356]),p(80,515,300),p(900,515,280),p(280,400,240),p(760,400,240),p(410,285,460),p(530,170,220)], hazards:[hazard('water',245,642,120),hazard('lava',640,642,130)], ember:[60,618],tide:[105,618],goals:[[540,108],[600,108]] },
  { platforms:[...floor([24,300],[460,260],[900,356]),p(100,520,250),p(930,520,240),p(260,405,230),p(800,405,230),p(420,295,440),p(530,175,220)], hazards:[hazard('lava',325,642,110),hazard('water',700,642,120),hazard('acid',555,302,120)], ember:[60,618],tide:[105,618],goals:[[540,113],[600,113]] },
  { platforms:[...floor([24,240],[420,220],[790,506]),p(80,520,260),p(930,520,240),p(250,390,250),p(780,390,250),p(400,275,480),p(540,155,220)], hazards:[hazard('lava',255,642,120),hazard('water',690,642,120),hazard('acid',555,282,120)], ember:[60,618],tide:[105,618],goals:[[550,93],[610,93]] },
  { platforms:[...floor([24,300],[480,250],[900,356]),p(100,520,250),p(930,520,240),p(260,410,220),p(800,410,220),p(420,300,440),p(520,180,240)], hazards:[hazard('lava',320,642,120),hazard('water',690,642,120),hazard('acid',560,322,120)], ember:[60,618],tide:[105,618],goals:[[550,118],[610,118]],boxData:[[360,622],[880,482]] },
  { platforms:[...floor([24,250],[470,220],[840,416]),p(90,525,250),p(920,525,230),p(320,405,640),p(480,285,340),p(580,165,220)], hazards:[hazard('water',275,642,120),hazard('lava',690,642,120)], ember:[60,618],tide:[105,618],goals:[[585,103],[645,103]],movingData:[[620,560,100,16,[{x:620,y:560},{x:900,y:560}]]] },
  { platforms:[...floor([24,260],[460,220],[860,396]),p(90,520,260),p(930,520,230),p(300,400,220),p(790,400,220),p(430,285,420),p(550,170,220)], hazards:[hazard('lava',280,642,120),hazard('water',690,642,120)], ember:[60,618],tide:[105,618],goals:[[570,108],[630,108]],plateData:[[310,512,'d26a'],[920,512,'d26a']],doorData:[['d26a',625,332]] },
  { platforms:[...floor([24,150],[1110,106]),p(70,520,230),p(980,520,230),p(300,405,680),p(440,290,400),p(560,175,220)], hazards:[hazard('acid',175,642,935),hazard('lava',390,428,120),hazard('water',820,428,120)], ember:[60,618],tide:[105,618],goals:[[570,113],[630,113]] },
  { platforms:[...floor([24,210],[350,170],[650,170],[950,306]),p(80,520,220),p(980,520,220),p(300,400,680),p(430,285,420),p(550,165,220)], hazards:[hazard('lava',235,642,100),hazard('water',520,642,100),hazard('acid',815,642,100)], ember:[60,618],tide:[105,618],goals:[[565,103],[625,103]] },
  { platforms:[...floor([24,280],[470,220],[830,426]),p(90,520,260),p(930,520,230),p(310,400,650),p(450,285,380),p(560,165,220)], hazards:[hazard('lava',300,642,120),hazard('water',690,642,120),hazard('acid',555,302,120)], ember:[60,618],tide:[105,618],goals:[[570,103],[630,103]],leverData:[[980,470,'d29']],doorData:[['d29',640,332]] },
  { platforms:[...floor([24,240],[450,240],[820,436]),p(80,520,250),p(940,520,230),p(260,405,220),p(800,405,220),p(420,290,440),p(540,170,220)], hazards:[hazard('water',265,642,110),hazard('lava',690,642,120)], ember:[60,618],tide:[105,618],goals:[[570,108],[630,108]] },
  { platforms:[...floor([24,200],[430,180],[750,526]),p(70,520,260),p(950,520,220),p(240,400,220),p(820,400,220),p(400,285,480),p(540,170,220)], hazards:[hazard('lava',225,642,100),hazard('water',550,642,100),hazard('acid',875,642,100)], ember:[60,618],tide:[105,618],goals:[[570,108],[630,108]],plateData:[[280,512,'d31'],[900,512,'d31']],doorData:[['d31',635,332]] },
  { platforms:[...floor([24,180],[300,150],[470,150],[640,150],[810,150],[980,276]),p(70,520,240),p(970,520,220),p(250,405,220),p(810,405,220),p(390,300,500),p(500,195,280),p(560,90,180)], hazards:[hazard('lava',205,642,80),hazard('water',375,642,80),hazard('acid',545,642,80),hazard('lava',715,642,80),hazard('water',885,642,80)], ember:[60,618],tide:[105,618],goals:[[570,28],[630,28]],plateData:[[190,512,'d32'],[1010,512,'d32']],doorData:[['d32',625,120]] }
];

function buildMechanisms(spec, id) {
  const m = { pushBoxes:(spec.boxData||[]).map((b,i)=>({id:`b${id}${i}`,x:b[0],y:b[1],width:38,height:38})), pressurePlates:[], levers:[], elementalRunes:[], doors:[], movingPlatforms:[], dualSwitches:[] };
  (spec.plateData||[]).forEach((v,i)=>{const [x,y,target]=v;m.pressurePlates.push(plate(`p${id}${i}`,x,y,[target],i?'#38bdf8':'#ef4444',i>0));});
  (spec.leverData||[]).forEach((v,i)=>{const [x,y,target]=v;m.levers.push(lever(`l${id}${i}`,x,y,[target]));});
  (spec.doorData||[]).forEach(v=>{const [idName,x,y]=v;m.doors.push(door(idName,x,y));});
  (spec.movingData||[]).forEach((v,i)=>{const [x,y,width,height,waypoints]=v;m.movingPlatforms.push({id:`mp${id}${i}`,x,y,width,height,waypoints,speed:90,color:'#eab308',requiresTrigger:false});});
  return m;
}

function buildLevel(id, spec) {
  const goals=spec.goals;
  const platforms=[...border(),...spec.platforms];
  const collectibles=[
    {type:'fire',x:Math.min(340,goals[0][0]-180),y:600},
    {type:'water',x:Math.max(420,goals[1][0]-160),y:600},
    {type:'universal',x:Math.round((goals[0][0]+goals[1][0])/2),y:Math.max(70,goals[0][1]-90)}
  ];
  return {
    id,name:`Forest Temple ${String(id).padStart(2,'0')}`,nameAr:`معبد الغابة ${String(id).padStart(2,'0')}`,
    theme:'forest-temple',description:'A compact two-player elemental puzzle room.',parTime:Math.max(28,70-Math.floor(id*0.9)),
    width:W,height:H,emberSpawn:{x:spec.ember[0],y:spec.ember[1]},tideSpawn:{x:spec.tide[0],y:spec.tide[1]},
    platforms,hazards:spec.hazards,mechanisms:buildMechanisms(spec,id),checkpoints:id>=24?[{id:`cp${id}`,x:620,y:600,width:30,height:50}]:[],
    collectibles,emberGoal:{x:goals[0][0],y:goals[0][1],width:42,height:62},tideGoal:{x:goals[1][0],y:goals[1][1],width:42,height:62},hints:[]
  };
}

export const FOREST_LEVELS=layouts.map((spec,index)=>buildLevel(index+1,spec));

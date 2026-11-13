import { test } from 'node:test';
import assert from 'node:assert/strict';
import game from '../../../games/monstruos/index.js';
import { LEVELS, allCodes, score, validGuess } from '../../../games/monstruos/engine/index.js';
import { candidates, decide } from '../../../games/monstruos/ai/index.js';
import { seededRandom } from '../../../modules/random/index.js';
import { startRecording, initialState, step, replay } from '../../../modules/recording/index.js';
const ctx = (seed=1) => ({rnd:seededRandom(seed),now:0});
const fresh = (difficulty='junior',seed=1) => game.setup({difficulty},ctx(seed));

test('las pistas cuentan primero lugares exactos y no duplican personajes repetidos',()=>{
  assert.deepEqual(score([0,0,1,2],[0,1,0,0]),{exact:1,misplaced:2});
  assert.deepEqual(score([0,0,1,1],[1,1,1,1]),{exact:2,misplaced:0});
  assert.deepEqual(score([0,1,2,3],[3,2,1,0]),{exact:0,misplaced:4});
  assert.deepEqual(score([0,1,2],[3,4,5]),{exact:0,misplaced:0});
});
test('puntuación simétrica, consistente con multiplicidades y acotada en todos los códigos de 3',()=>{
  const codes = allCodes({slots:3,repeats:true});
  for (const a of codes) for (const b of codes) {
    const f=score(a,b); assert.deepEqual(f,score(b,a));
    let common=0;
    for(let id=0;id<6;id++) common+=Math.min(a.filter(x=>x===id).length,b.filter(x=>x===id).length);
    assert.equal(f.exact+f.misplaced,common); assert.ok(f.exact+f.misplaced<=3);
    assert.equal(f.exact===3,JSON.stringify(a)===JSON.stringify(b));
  }
});
test('niveles, semilla, códigos y repeticiones válidos',()=>{
  assert.deepEqual(Object.values(LEVELS).map(l=>allCodes(l).length),[120,360,1296]);
  for(const difficulty of Object.keys(LEVELS)) for(let seed=0;seed<30;seed++) {
    const a=fresh(difficulty,seed); assert.deepEqual(a,fresh(difficulty,seed)); assert.ok(validGuess(a,a.secret));
    assert.equal(a.slots,LEVELS[difficulty].slots);
  }
});
test('vista y consejo no reciben secreto y no mutan el estado',()=>{
  const st=fresh(); const copy=JSON.stringify(st);
  for(const seat of [-1,0,1]) { const v=game.view(st,seat); assert.ok(!('secret' in v)); assert.ok(!('solution' in v)); v.history.push({}); }
  const v=game.view(st,0); const hint=game.advise(v,0,ctx());
  assert.ok(validGuess(st,hint.action.code)); assert.equal(hint.count,120); assert.equal(JSON.stringify(st),copy);
});
test('rechaza acciones inválidas, huecos, repetidos, espectadores e intentos duplicados',()=>{
  const st=fresh();
  for(const code of [[],[0,1],[0,0,1],[0,1,6],[0,1,-1],[0,1,1.5],[0,1,'2'],Array(3)])
    assert.throws(()=>game.apply(st,0,{type:'guess',code},ctx()));
  for(const seat of [-1,1]) assert.throws(()=>game.apply(st,seat,{type:'guess',code:[0,1,2]},ctx()));
  assert.throws(()=>game.apply(st,0,null,ctx()));
  assert.throws(()=>game.apply(st,0,{type:'fake'},ctx()));
  const next=game.apply({...st,secret:[3,4,5]},0,{type:'guess',code:[0,1,2]},ctx());
  assert.equal(st.history.length,0); assert.equal(next.history.length,1);
  assert.throws(()=>game.apply(next,0,{type:'guess',code:[0,1,2]},ctx()));
});
test('gana incluso en el último intento; perder o rendirse revela el secreto y cierra la partida',()=>{
  const st=fresh(); let a={...st,secret:[3,4,5]};
  const wrong=allCodes(a).filter(c=>JSON.stringify(c)!==JSON.stringify(a.secret));
  for(let i=0;i<a.attempts-1;i++) a=game.apply(a,0,{type:'guess',code:wrong[i]},ctx());
  const win=game.apply(a,0,{type:'guess',code:a.secret},ctx());
  assert.ok(win.won); assert.ok(game.isOver(win)); assert.equal(game.result(win).winner,0);
  assert.deepEqual(game.view(win,0).solution,a.secret);
  const loss=game.apply(a,0,{type:'guess',code:wrong[a.attempts-1]},ctx());
  assert.ok(game.isOver(loss)); assert.equal(game.result(loss).winner,null); assert.deepEqual(game.currentSeats(loss),[]);
  assert.deepEqual(game.legalActions(loss,0),[]); assert.throws(()=>game.apply(loss,0,{type:'giveup'},ctx()));
  const given=game.apply(st,0,{type:'giveup'},ctx()); assert.ok(given.gaveUp); assert.deepEqual(game.view(given).solution,st.secret);
});
test('repeticiones del experto y acciones completas se reproducen con recording',()=>{
  const config={difficulty:'expert'};
  let rec=startRecording({game,config,seed:'monstruos',now:0}),state=initialState(game,rec);
  ({state,rec}=step(game,state,rec,0,{type:'guess',code:[0,0,1,1]},1));
  if(!game.isOver(state)) ({state,rec}=step(game,state,rec,0,{type:'guess',code:state.secret},2));
  assert.deepEqual(replay(game,JSON.parse(JSON.stringify(rec))),state);
});
test('la deducción conserva la solución y resuelve una muestra de todos los niveles sin mirar el secreto',()=>{
  for(const difficulty of Object.keys(LEVELS)) for(let seed=0;seed<12;seed++) {
    let st=fresh(difficulty,seed);
    while(!game.isOver(st)) {
      const v=game.view(st,0),poss=candidates(v);
      assert.ok(poss.some(c=>JSON.stringify(c)===JSON.stringify(st.secret)));
      const action=decide(v,0); assert.ok(action); st=game.apply(st,0,action,ctx());
    }
    assert.ok(st.won,`${difficulty}, semilla ${seed}`);
  }
});

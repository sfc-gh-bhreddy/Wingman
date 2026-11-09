import test from "node:test"; import assert from "node:assert";
import { districtBacklog } from "./lib/activation-progress.ts";
const h=(d)=>({status:"OBSERVED_TRANSITION",firstObservedDate:d,previousObservedDate:"2026-09-01",checkedAt:"2026-12-05T00:00:00Z",district:"D",sem:"S"});
const deals=[]; let i=0;
for(let k=0;k<10;k++) deals.push({accountId:"a"+i++,district:"D",seManager:"S",activationHistory:h("2026-10-10")});
for(let k=0;k<13;k++) deals.push({accountId:"a"+i++,district:"D",seManager:"S",activationHistory:h("2026-11-10")});
test("backlog",()=>{const b=districtBacklog(deals,new Date("2026-12-10T12:00:00Z"),"D");
assert.deepEqual(b.months.map(m=>[m.goal,m.added,m.owed]),[[12,10,2],[14,13,1]]); assert.equal(b.total,1);
assert.equal(districtBacklog(deals,new Date("2026-10-20T12:00:00Z"),"D").status,"none");});

import {validateMission,validateWorker,changeMission} from './core.mjs';
export function seed() {
 const workers=[
 {name:'Alex Rivera · demo',city:'Rutherford, NJ',schedule:'Weekend',skills:['Photography','Copywriting','Google Business'],minPayUSD:90},
 {name:'Taylor Morgan · demo',city:'Hackensack, NJ',schedule:'Flexible',skills:['Photography','Video Editing','Social Media'],remoteAvailable:true,minPayUSD:110},
 {name:'Jordan Lee · demo',city:'Rutherford, NJ',schedule:'Weekday',skills:['Data Entry','Copywriting','Google Business'],minPayUSD:75},
 {name:'Sam Ellis · demo',city:'Clifton, NJ',schedule:'Weekend',skills:['Social Media','Copywriting','Digital Setup'],minPayUSD:80},
 ].map(x=>validateWorker({...x,age18Confirmed:true}).value);
 const missions=[
 {title:'Refresh café listing and storefront photographs',buyer:'Northline Café · demo',city:'Rutherford, NJ',category:'Business Photos',schedule:'Weekend',skills:['Photography','Google Business'],priceUSD:249,description:'Capture ten storefront and menu photographs, prepare resized images, and organize a gallery for buyer review.'},
 {title:'Create three promotional social media posts',buyer:'Hillside Fitness · demo',city:'Clifton, NJ',category:'Content & Copy',schedule:'Weekend',skills:['Social Media','Copywriting'],priceUSD:189,description:'Prepare three static promotional posts and captions based on customer-provided brand assets for approval.'},
 {title:'Clean up service menu and online listing text',buyer:'Clearview Services · demo',city:'Hackensack, NJ',category:'Digital Setup',schedule:'Flexible',skills:['Copywriting','Google Business'],priceUSD:159,description:'Proofread and format service descriptions, identify missing listing details, and deliver an editable document.'}
 ].map(x=>validateMission(x).value);
 missions[1]=changeMission(missions[1],'APPROVED',{safetyReviewed:true,reviewNote:'Simulated scope review; no real-world dispatch.'});
 missions[2]=changeMission(missions[2],'APPROVED',{safetyReviewed:true,reviewNote:'Simulated scope review; no real-world dispatch.'});
 return {version:1,sandbox:true,missions,workers,activity:[{id:'demo-start',time:new Date().toISOString(),message:'Sample missions loaded — all entries are fictional.'}]};
}

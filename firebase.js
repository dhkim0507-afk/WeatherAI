// Firebase를 사용하려면 firebase-config.example.js를 firebase-config.js로 복사하고 값을 입력하세요.
let cfg=null;
try{cfg=(await import("./firebase-config.js")).firebaseConfig}catch{}
if(cfg){
 const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged},{getFirestore,doc,setDoc,getDoc}]=await Promise.all([
  import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
  import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
  import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js")
 ]);
 const app=initializeApp(cfg),auth=getAuth(app),db=getFirestore(app),provider=new GoogleAuthProvider();
 let user=null;
 async function loadFavs(u){const s=await getDoc(doc(db,"users",u.uid));if(s.exists())window.dispatchEvent(new CustomEvent("firebase-favorites",{detail:s.data().favorites||[]}))}
 window.weatherFirebase={
  login:()=>signInWithPopup(auth,provider),
  logout:()=>signOut(auth),
  saveFavorites:async favs=>{if(user)await setDoc(doc(db,"users",user.uid),{favorites:favs,updatedAt:new Date().toISOString()},{merge:true})}
 };
 onAuthStateChanged(auth,u=>{user=u;window.dispatchEvent(new CustomEvent("firebase-user",{detail:u?{displayName:u.displayName,email:u.email}:null}));if(u)loadFavs(u)})
}

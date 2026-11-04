/* ATLAS_PORTABLE_STORAGE_BEGIN */
/* Some local-file browser contexts reject IndexedDB but allow localStorage.
   Keep the existing database and identifiers; use this adapter only as fallback. */
(() => {
  const prefix='atlas-seguros:arquivos-portateis:v1:';
  const originalPut=arquivoPut,originalGet=arquivoGet,originalDel=arquivoDel,originalClear=arquivosLimpar;
  const key=id=>prefix+String(id);
  const encode=blob=>new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(',')[1]);
    reader.onerror=()=>reject(reader.error||new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(blob);
  });
  function decode(value){
    if(!value)return null;
    const record=JSON.parse(value),raw=atob(record.data),bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return new Blob([bytes],{type:record.type||'application/octet-stream'});
  }
  arquivoPut=async function(id,blob){
    try{
      await originalPut(id,blob);
      try{localStorage.removeItem(key(id));}catch(e){/* Original database is sufficient. */}
      return true;
    }catch(databaseError){
      const data=await encode(blob);
      // A quota/storage failure propagates to the existing attachment error UI.
      localStorage.setItem(key(id),JSON.stringify({type:blob.type||'application/octet-stream',data}));
      return true;
    }
  };
  arquivoGet=async function(id){
    try{const blob=await originalGet(id);if(blob)return blob;}catch(e){/* Try portable storage. */}
    try{return decode(localStorage.getItem(key(id)));}catch(e){return null;}
  };
  arquivoDel=async function(id){
    let removed=false;
    try{removed=localStorage.getItem(key(id))!==null;localStorage.removeItem(key(id));}catch(e){/* Try the existing database. */}
    return await originalDel(id)||removed;
  };
  arquivosLimpar=async function(){
    let cleared=false;
    try{
      const keys=[];
      for(let i=0;i<localStorage.length;i++){const name=localStorage.key(i);if(name&&name.startsWith(prefix))keys.push(name);}
      keys.forEach(name=>localStorage.removeItem(name));cleared=true;
    }catch(e){/* The original clear still runs. */}
    return await originalClear()||cleared;
  };
})();
/* ATLAS_PORTABLE_STORAGE_END */

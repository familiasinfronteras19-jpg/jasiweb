(function(){
  /* Tu hoja de Google Sheets debe tener cuatro columnas:
     A = nombre de la app, B = enlace de descarga, C = descripción, D = especificaciones.
     Las especificaciones se escriben separadas por | con el formato  Nombre: valor
     Ejemplo:  Plataforma: Android | Versión: 2.4.1 | Tamaño: 18 MB
     Publica la hoja (Archivo > Compartir > Publicar en la Web > CSV) y pega aquí el enlace. */
  var SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1hq7DpekOSpwfgoL9iipFTSYO6QUDH9FrjOGWGUp27os/gviz/tq?tqx=out:csv";

  var DEMO = [
    ["JasiNotas","","Notas rápidas con carpetas, etiquetas y copia de seguridad en tu hoja de cálculo.","Plataforma: Android | Versión: 2.4.1 | Tamaño: 18 MB | Precio: Gratis"],
    ["RutaBar","","Encuentra bares y paradas cerca de tu ruta y guarda tus favoritos sin conexión.","Plataforma: Android | Versión: 1.9.0 | Tamaño: 42 MB | Precio: Gratis"],
    ["Pixel Forja","","Editor de fotos por capas con ajustes de curvas, máscaras y exportación por lotes.","Plataforma: Windows | Versión: 5.0.2 | Tamaño: 210 MB | Precio: 4,99 €"],
    ["Tareas Rojas","","Listas de tareas con prioridades por color y recordatorios que no se acumulan.","Plataforma: iOS | Versión: 3.1.0 | Tamaño: 36 MB | Precio: Gratis"],
    ["Cuenta Clara","","Registra gastos e ingresos y revisa el mes en una sola pantalla.","Plataforma: Web | Versión: 1.2.3 | Precio: Gratis"],
    ["Arcade 404","","Recreativas retro de un solo botón con marcadores semanales.","Plataforma: Android | Versión: 0.9.8 | Tamaño: 156 MB | Precio: Gratis"],
    ["SonoMix","","Mezclador de pistas con cuatro canales, bucles y exportación en WAV.","Plataforma: Windows | Versión: 4.3.0 | Tamaño: 95 MB | Precio: 2,99 €"],
    ["Aula Lite","","Fichas de estudio y cuestionarios cortos que funcionan sin internet.","Plataforma: Android | Versión: 2.0.5 | Tamaño: 27 MB | Precio: Gratis"]
  ];

  var $ = function(id){return document.getElementById(id)};
  var state = {apps:[], q:"", cat:""};
  var lastFocus = null;

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}
  function tile(name){var h=0;for(var i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;return "t"+(h%3)}
  function icon(a){return '<span class="ico '+tile(a.nombre)+'" aria-hidden="true">'+esc(a.nombre.charAt(0).toUpperCase())+'</span>'}

  /* Columna D: "Clave: valor | Clave: valor", también acepta ; o saltos de línea */
  function parseSpecs(s){
    return String(s||"").split(/\s*(?:\||;|\n)\s*/).map(function(p){
      p=p.trim();if(!p)return null;
      var m=p.match(/^([^:]{1,40}):\s*(.+)$/);
      return m?{k:m[1].trim(),v:m[2].trim()}:{k:"Dato",v:p};
    }).filter(Boolean);
  }

  function parseCSV(t){
    var rows=[],row=[],cur="",q=false;
    for(var i=0;i<t.length;i++){
      var c=t[i];
      if(q){ if(c==='"'){ if(t[i+1]==='"'){cur+='"';i++} else q=false } else cur+=c }
      else if(c==='"') q=true;
      else if(c===","){row.push(cur);cur=""}
      else if(c==="\n"||c==="\r"){ if(c==="\r"&&t[i+1]==="\n")i++; row.push(cur);rows.push(row);row=[];cur="" }
      else cur+=c;
    }
    if(cur||row.length){row.push(cur);rows.push(row)}
    return rows.filter(function(r){return r.some(function(x){return x.trim()})});
  }

  /* Categoría: se lee de la columna D con el formato  Categoría: Juegos  (también vale Categorías o Tipo) */
  function catOf(specs){
    for(var i=0;i<specs.length;i++){
      if(/^(categoria|categorias|tipo)$/.test(norm(specs[i].k)))return specs[i].v;
    }
    return "";
  }

  /* Por posición: A nombre, B enlace, C descripción, D especificaciones. Se ignora la fila de títulos. */
  function clean(rows){
    if(rows.length&&/^(app|apps|nombre|nombre de la app|nombre app)$/i.test((rows[0][0]||"").trim()))rows=rows.slice(1);
    return rows.filter(function(r){return (r[0]||"").trim()}).map(function(r,i){
      var link=(r[1]||"").trim();
      var specs=parseSpecs(r[3]);
      return {i:i,nombre:r[0].trim(),enlace:/^https?:/i.test(link)?link:"",descripcion:(r[2]||"").trim(),specs:specs,cat:catOf(specs)};
    });
  }

  function visible(){
    var q=norm(state.q);
    return state.apps.filter(function(a){
      if(state.cat&&norm(a.cat)!==state.cat)return false;
      return !q||norm(a.nombre+" "+a.descripcion+" "+a.specs.map(function(s){return s.k+" "+s.v}).join(" ")).indexOf(q)>=0;
    });
  }

  /* Botones de categoría: salen solos de lo que escribas en la columna D */
  function renderChips(){
    var seen={},list=[];
    state.apps.forEach(function(a){
      var k=norm(a.cat);
      if(k&&!seen[k]){seen[k]=1;list.push({k:k,label:a.cat})}
    });
    if(!list.length){$("chips").innerHTML="";return}
    list.sort(function(a,b){return a.label.localeCompare(b.label,"es")});
    list.unshift({k:"",label:"Todas"});
    $("chips").innerHTML=list.map(function(c){
      return '<button class="chip" type="button" data-cat="'+esc(c.k)+'" aria-pressed="'+(c.k===state.cat)+'">'+esc(c.label)+'</button>';
    }).join("");
  }

  function renderHero(){
    var f=state.apps[0];
    if(!f){$("hero").innerHTML="";return}
    $("hero").innerHTML=
      '<button class="feat" type="button" data-i="'+f.i+'">'+
        '<div><p class="eyebrow">App destacada</p><h1>'+esc(f.nombre)+'</h1>'+
        '<p class="lead">'+esc(f.descripcion)+'</p>'+
        '<p class="facts">'+f.specs.slice(0,3).map(function(s){return '<span>'+esc(s.v)+'</span>'}).join("")+'</p>'+
        '<span class="cta">Ver ficha</span></div>'+
        '<div class="giant" aria-hidden="true">'+esc(f.nombre.charAt(0).toUpperCase())+'</div>'+
      '</button>';
  }

  function renderGrid(){
    var list=visible();
    $("count").textContent=list.length+(list.length===1?" app":" apps");
    if(!list.length){
      $("grid").innerHTML='<div class="empty"><p>No hay apps que coincidan con tu búsqueda.</p><button class="link" type="button" id="reset">Borrar búsqueda</button></div>';
      return;
    }
    $("grid").innerHTML=list.map(function(a){
      return '<button class="card" type="button" data-i="'+a.i+'">'+
        '<span class="head">'+icon(a)+'<h3>'+esc(a.nombre)+'</h3></span>'+
        '<p class="desc">'+esc(a.descripcion)+'</p>'+
        '<span class="foot">'+a.specs.slice(0,3).map(function(s){return '<span>'+esc(s.v)+'</span>'}).join("")+'</span>'+
      '</button>';
    }).join("");
  }

  function openApp(i){
    var a=state.apps.filter(function(x){return x.i===i})[0];if(!a)return;
    lastFocus=document.activeElement;
    $("sheet").innerHTML=
      '<div class="sheet-top">'+icon(a)+'<h2 id="mTitle">'+esc(a.nombre)+'</h2>'+
        '<button class="close" type="button" id="closeBtn" aria-label="Cerrar ficha">×</button></div>'+
      (a.enlace
        ? '<a class="dl" href="'+esc(a.enlace)+'" target="_blank" rel="noopener noreferrer">Descargar</a>'
        : '<a class="dl" aria-disabled="true" href="#" tabindex="-1">Sin enlace de descarga</a>')+
      '<p class="sec">Descripción</p><p class="long" style="margin-top:8px">'+esc(a.descripcion||"Sin descripción.")+'</p>'+
      '<p class="sec">Especificaciones</p>'+
      (a.specs.length
        ? '<dl class="specs">'+a.specs.map(function(s){return '<div><dt>'+esc(s.k)+'</dt><dd>'+esc(s.v)+'</dd></div>'}).join("")+'</dl>'
        : '<p class="long" style="margin-top:8px">Sin especificaciones.</p>');
    $("modal").hidden=false;
    $("closeBtn").focus();
  }
  function closeApp(){
    $("modal").hidden=true;
    if(lastFocus&&lastFocus.focus)lastFocus.focus();
  }

  function start(rows,msg){
    state.apps=clean(rows);
    renderHero();renderChips();renderGrid();$("status").textContent=msg;
  }

  document.addEventListener("click",function(e){
    var t=e.target;
    var chip=t.closest&&t.closest(".chip");
    if(chip){state.cat=chip.getAttribute("data-cat");renderChips();renderGrid();return}
    var open=t.closest&&t.closest("[data-i]");
    if(open){openApp(parseInt(open.getAttribute("data-i"),10));return}
    if(t.id==="reset"){state.q="";state.cat="";$("q").value="";renderChips();renderGrid();return}
    if(t.id==="closeBtn"||t.id==="modal")closeApp();
  });
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("modal").hidden)closeApp()});
  $("q").addEventListener("input",function(e){state.q=e.target.value;renderGrid()});

  var demoMsg="Catálogo de ejemplo. Para mostrar tus apps, pega el enlace CSV de tu hoja de Google Sheets en SHEET_CSV_URL.";
  if(SHEET_CSV_URL){
    fetch(SHEET_CSV_URL).then(function(r){if(!r.ok)throw new Error(r.status);return r.text()}).then(function(t){
      var rows=parseCSV(t);
      if(!rows.length)throw new Error("vacía");
      start(rows,"Catálogo leído de Google Sheets.");
    }).catch(function(){
      start(DEMO,"No se pudo leer la hoja. Se muestra el catálogo de ejemplo.");
    });
  } else {
    start(DEMO,demoMsg);
  }
})();

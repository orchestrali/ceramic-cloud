const places = "1234567890ETABCDFGHJKLMN";
var tonictriad = [
  {stage: 8, bells: [1,4,6,8], tonic: [1,8]},
  {stage: 10, bells: [1,3,6,8,10], tonic: [3,10]},
  {stage: 12, bells: [1,3,5,8,10,12], tonic: [5,12]}
];
//specifically "root position" only one octave
var arpeggios = [
  {bells: [2,5,7,9], minstage: 10},
  {bells: [1,4,6,8], minstage: 10},
  {bells: [3,6,8,10], minstage: 12}, //tonic on ten, but that's separate???
  {bells: [4,7,9,11], minstage: 12}
];
var tritone = {
  stage8: [2,5],
  stage10: [4,7],
  stage12: [2,6,9]
};
var svg;
var url = "https://api.complib.org/";
//holder for rows from complib
var rowarr = [];
var compcalls = [];
//features of current search
var stage;
var numbells;
var tenor;
var what;
//holder for method information: leadhead
var methodinfo = {};
var leadlength;
//holder for experiment so I can study it
var stringrepetition;

$(function() {
  //console.log("ohhh argh");
  $("#svgcontainer").svg({onLoad: (o) => {
    svg = o;
    svg.configure({xmlns: "http://www.w3.org/2000/svg", "xmlns:xlink": "http://www.w3.org/1999/xlink", width: 0, height: 0});
  }});
  $("#submit").on("click", subcomplib);
  $("#cosearch").on("keyup", cosearchkeyup);
  $("#cosearchbutton").on("click", cosearch);
});

//clear any previous stuff and figure out the current search
function subcomplib() {
  $("tbody").contents().detach();
  $("h3,#reptable").detach();
  $("#container,#table").contents().detach();
  $("#composition div ul").contents().detach();
  methodinfo = {};
  leadlength = null;
  if (!$("#summary").hasClass("hidden")) {
    $("#summary").addClass("hidden");
  }
  $("#cosearchbar").addClass("hidden");
  let num = $("#complibid").val();
  if (num.length > 4 && /^\d+$/.test(num)) {
    tenor = $("#addtenor").prop("checked");
    what = $('input[name="complibwhat"]:checked').val();
    let access = $("#accesskey").val() || "";
    console.log(what);
    getcomplib(num, access, ["composition","compexperiment"].includes(what) ? "composition" : "method");
  }
}

//get rows
function getcomplib(compid, access, w) {
  var xhr = new XMLHttpRequest();
  let q = access.length ? "?accessKey="+access : "";
  xhr.open('GET', url+w+"/"+compid+"/rows"+q, true);
  xhr.send();

  xhr.onload = function() {
    let results = JSON.parse(xhr.responseText);
    rowarr = [];
    if (results.rows) {
      stage = results.stage;
      console.log("stage",stage);
      numbells = tenor ? stage+1 : stage;
      $("#container").append(`<h3>${results.title}</h3>`);
      //add each row to rowarr (not including rowzero)
      for (let i = 2; i < results.rows.length; i++) {
        let row = results.rows[i][0].split("").map(bellnum);
        if (tenor) row.push(stage+1);
        rowarr.push(row);
        if (results.rows[i][1].length) {
          compcalls.push([i+2,results.rows[i][1]]);
        }
        if (!leadlength && checkbit(results.rows[i][2],4)) {
          //at the first row that has the leadhead flag set, get this info
          leadlength = i-1;
          //console.log(leadlength);
          //this will be incorrect if I've gotten a composition and there's a call at the first leadend...
          //taking from complib results so tenor behind isn't included
          methodinfo.leadhead = results.rows[i][0];
        }
      }

      //not sure I actually need any of this
      if (what === "experiment") {
        //new method experiment
        methodexperiment();
      } else if (what === "compexperiment") {
        //highlightlarge();
        //analyzesteps();
        temporarycompound();
      } else {
        if (what === "method") {
          let plainlhs = plainleadheads(stage).map(a => rowstring(a));
          if (plainlhs.includes(methodinfo.leadhead)) {
            //show coursing order search field
            $("#cosearchbar").removeClass("hidden");
          }
        }
        threecolumnexperiment(rowarr);
      }
      
    }
  }
}

//complib provides rows with a number representing 16 flags (only it's not a number, it's a string!!!!)
//check if a particular flag is set
function checkbit(value, bit) {
  let num = Number(value);
  let pow = Math.pow(2, bit);
  let d = Math.floor(num/pow);
  return d % 2 === 1;
}

//take arrays of html and add them
function displayanalysis(rows, cats) {
  $("#rowcolumn").append(`<li class="fade">${places.slice(0,numbells)}</li>`); //
  $("#catcolumn").append(`<li class="fade">(starting rounds)</li>`); //
  $("#catcolumn").addClass("notrows");
  
  rows.forEach(h => {
    $("#rowcolumn").append(h);
  });
  
  cats.forEach(h => {
    $("#catcolumn").append(h);
  });
}


function cosearchkeyup() {
  $("#cosearchbar p").text("");
  let search = $("#cosearch").val().toUpperCase();
  let chararr = search.split("");
  let goodchars = chararr.every(c => places.slice(0, stage).includes(c));
  let length = search.length === stage-1;
  if (goodchars && length) {
    $("#cosearchbutton").removeClass("disabled");
  } else {
    $("#cosearchbutton").addClass("disabled");
  }
  if (!goodchars) {
    $("#cosearchbar p").text("invalid character in search");
  }
}

function cosearch() {
  if (!$("#cosearchbutton").hasClass("disabled")) {
    $("#cosearchbutton").addClass("disabled");
    let search = $("#cosearch").val().toUpperCase();
    let coarr = search.split("").map(bellnum);
    let rotated = rotateco(coarr, stage);
    let course = buildcourse(rotated);
    $("#composition div ul").contents().detach();
    threecolumnexperiment(course);
  }
}

function threecolumnexperiment(rowarr) {
  //steps, thirds, tonic
  //#thirdcolumn
  let keys = ["steps","thirds","oct","tonic"];
  if (numbells < 8 || numbells%2 === 1) keys.splice(3, 1);
  if (numbells < 10) keys.splice(2, 1);
  let lists = {};
  keys.forEach(k => lists[k] = []);
  rowarr.forEach(r => {
    let data = collectdata(r);
    keys.forEach((w,i) => {
      let colors = i === 0 ? ["highlightblue", "highlightgreen"] : ["highlightred", "highlightpurple"];
      let pp = data[w] || [];
      lists[w].push(buildhighlighting(r, pp, colors));
    });
    
  });
  
  keys.forEach((key,i) => {
    let target = "#composition div:nth-child("+(i+1)+") ul";
    $(target).append(`<li>${key}</li>`); //used to be rounds, now header, both would mess up backstroke indications
    lists[key].forEach(h => $(target).append(h));
  });
}

//given a row and places to highlight, build the html
function buildhighlighting(r,pp,colors) {
  if (!colors) colors = ["highlightblue", "highlightgreen"];
  let html = `<li>`;
  if (pp.length === 0) {
    html = `<li class="fade">` + rowstring(r) + `</li>`;
  } else {
    let prev = -1;
    let dir = 1;
    for (let p = 1; p <= r.length; p++) {
      let i = pp.findIndex(a => a.includes(p));
      if (i === -1) {
        //place not included in run or whatever
        if (prev > -1) {
          html += `</span>`;
        }
        html += rowstring(r)[p-1];
      } else {
        let c = dir === 1 ? colors[0] : colors[1];
        if (prev === -1) {
          html += `<span class="${c}">`;
          dir *= -1;
        } else if (prev != i) {
          html += `</span><span class="${c}">`;
          dir *= -1;
        }
        html += rowstring(r)[p-1];
      }
      prev = i;
    }
    if (prev > -1) {
      html += `</span>`;
    }
    html += `</li>`;
  }
  return html;
}

function temporarycompound() {
  
  rowarr.forEach(r => {
    let data = collectdata(r);
    if (data.compound) {
      $("#rowcolumn").append(`<li>${rowstring(r)}</li>`);
    }
  });
  
}

function highlightlarge() {
  let rowhtml = [];
  let cathtml = [];
  let diffcount = 0;
  rowarr.forEach(r => {
    let data = collectdata(r);
    let maxes = comparesizes(data);
    if (maxes.maxkey != maxes.largekey) diffcount++;

    if (data.compound) {
      let html = `<li><span class="highlightgreen">${rowstring(r)}</span> </li>`;
      let cat = `<li>Alison's favorite: compound melody!</li>`;
      rowhtml.push(html);
      cathtml.push(cat);
    } else if (data.good) {
      let html = `<li><span class="highlightblue">${rowstring(r)}</span> </li>`;
      let cat = `<li>whole row</li>`;
      rowhtml.push(html);
      cathtml.push(cat);
    } else if (maxes.largest > 3) {
      let key = maxes.maxkey;
      let pp = data[key];
      let html = buildhighlighting(r,pp);
      
      let cat = `<li>${key}</li>`;
      rowhtml.push(html);
      cathtml.push(cat);
    } else {
      let html = `<li>${rowstring(r)} </li>`;
      let cat = `<li class="fade">none</li>`;
      rowhtml.push(html);
      cathtml.push(cat);
    }
  });
  console.log("diffcount: "+diffcount);
  displayanalysis(rowhtml, cathtml);
}

function highlightgood() {
  let rowhtml = [];
  let cathtml = [];
  rowarr.forEach(r => {
    let data = collectdata(r);

    if (data.compound) {
      let html = `<li><span class="highlightgreen">${rowstring(r)}</span> </li>`;
      let cat = `<li>Alison's favorite: compound melody!</li>`;
      rowhtml.push(html);
      cathtml.push(cat);
    } else {
      let html = `<li>`;
      let prev;
      for (let p = 1; p <= numbells; p++) {
        if (data.used.includes(p)) {
          if (!prev) {
            html += `<span class="highlightblue">`;
          }
          html += rowstring(r)[p-1];
          prev = true;
        } else {
          if (prev) {
            html += `</span>`;
          }
          html += rowstring(r)[p-1];
          prev = false;
        }
      }
      if (prev) {
        html += `</span>`;
      }
      html += `</li>`;
      let cat = `<li>${data.used.length} places</li>`;
      rowhtml.push(html);
      cathtml.push(cat);
    }
  });
  displayanalysis(rowhtml, cathtml);
}

//examine each row for steps and highlight them
function analyzesteps() {
  let rowhtml = [];
  let cathtml = [];
  let goodcount = 0;
  let compound = 0;
  rowarr.forEach(r => {
    let data = collectdata(r);
    let runs = data.steps;
    let runcombos;
    if (data.good) goodcount++;
    if (data.compound) compound++;
    
    if (runs.length === 0) {
      let html = `<li>${rowstring(r)} </li>`;
      let cat = `<li class="fade">none</li>`;
      rowhtml.push(html);
      cathtml.push(cat);
    } else {
      runcombos = groupchunks(runs);
      //if (runcombos.length < runs.length) console.log(rowstring(r));
      //let t = rowstring(r) === "12346857";
      //console.log(rowstring(r));
      //console.log(runs);
      let html = `<li>`;
      let prev = -1;
      let dir = 1;
      for (let p = 1; p <= numbells; p++) {
        //if (t) console.log(p, prev);
        let i = runs.findIndex(a => a.includes(p));
        let b = rowstring(r)[p-1];
        if (i === -1) {
          if (prev > -1) {
            html += `</span>`;
          }
          //console.log(rowstring(r));
          //console.log(html);
          html += b;
          prev = -1;
        } else {
          if (i === prev) {
            html += b;
          } else {
            if (prev > -1) {
              html += `</span>`;
              dir*=-1;
            }
            let c = dir === 1 ? "highlightblue" : "highlightgreen";
            html += `<span class="${c}">`+b;
            prev = i;
          }
        }
      }
      if (prev > -1) html += `</span>`;
      html += `</li>`;
      let cat = `<li>${runs.length} step chunk(s)</li>`;
      rowhtml.push(html);
      cathtml.push(cat);
    }
  });
  displayanalysis(rowhtml, cathtml);
  console.log("goodcount: "+goodcount);
  console.log("compound: "+compound);
}

function coursingdiagrams() {
  $("#svgcontainer").contents().remove();
  let parent = svg.svg($("#svgcontainer"), null, null, 500, 1000, {xmlns: "http://www.w3.org/2000/svg", "xmlns:xlink": "http://www.w3.org/1999/xlink"});
  let dotgroup = svg.group(parent, {style: "stroke: none; fill: black;"});
  let trebleg = svg.group(parent, {style: "stroke: red; stroke-width: 1px; fill: none;"});
  let arcgroup = svg.group(parent, {style: "stroke: blue; stroke-width: 2px; fill: none;"});
  let homeco = homecourseorder(stage);
  homeco.unshift(stage);
  let y = 30;
  for (let i = 0; i < leadlength/2; i++) {
    let row = rowarr[i];
    for (let p = 0; p < stage; p++) {
      svg.circle(dotgroup, 30+p*30, y, 3);
    }
    let treblei = row.indexOf(1);
    svg.circle(trebleg, 30+treblei*30, y, 5);
    let swaps = [0,stage-1];
    if (treblei === 0) swaps.push(1);
    if (treblei === stage-1) swaps.push(stage-2);
    //start on top if tenor is in last place, on bottom otherwise
    let side = (row.indexOf(stage) === stage-1 || (treblei === stage-1 && row.indexOf(stage) === stage-2)) ? -1 : 1;
    for (let j = 1; j < homeco.length; j++) {
      let startp = row.indexOf(homeco[j-1]);
      let endp = row.indexOf(homeco[j]);
      let diff = Math.abs(endp-startp);
      let controly = y + side*7 + side*12*diff/(stage-1);
      let xadd = endp > startp ? [35,25] : [25,35];
      let coords = ["M", 30+startp*30, y, "C", xadd[0]+startp*30, controly, xadd[1]+endp*30, controly, 30+endp*30, y];
      svg.path(arcgroup, coords.join(" "));
      if (swaps.includes(endp)) side *= -1;
    }

    y += 40;
  }
}

function repetitiontable() {

  for (let string in stringrepetition) {
    let count = stringrepetition[string].length;
    let rows = stringrepetition[string];
    let trow = `<tr class="border"><td rowspan="${count}">${string}</td><td rowspan="${count}">`;
    let order = string.split("").map(bellnum).sort((a,b) => a-b);
    trow += rowstring(order) + "</td><td>";
    for (let i = 0; i < count; i++) {
      if (i > 0) {
        trow += `<tr><td>`;
      }
      let elems = [rows[i].row, rows[i].rownum, rows[i].rownum%leadlength];
      trow += elems.join(`</td><td>`);
      trow += `</td></tr>`;
    }
    $("#reptable").append(trow);
  }
}

function reprowclick(e) {
  $("#reptable span").removeClass("highlightgreen");
  $("#reptable li").removeClass("highlightblue");

  let row = $(this).text();
  let rows = rowarr.map(r => rowstring(r));
  let rownums = findcopies(row, rows);
  $(this).addClass("highlightblue");
  rownums.forEach(o => {
    let n = o.rownum;
    let col = Math.floor(n/leadlength) + 1;
    let li = n%leadlength + 1;
    let elem = $("#reptable td:nth-child("+col+") li:nth-child("+li+")");
    //$("#reptable td:nth-child("+col+") li:nth-child("+li+")").addClass("highlightgreen");
    let text = elem.text();
    let version = text.split("");
    version.splice(o.start+o.length, 0, "</span>");
    version.splice(o.start, 0, `<span class="highlightgreen">`);
    elem.contents().remove();
    elem.append(version.join(""));
  });
}

function methodexperiment() {
  coursingdiagrams();
  let configs = rowarr.map(r => rowstring(r).replace(/[23456]/g, "x")).sort((a,b) => {
    let diff = a.indexOf("1") - b.indexOf("1");
    if (diff === 0) {
      let t = places[stage-1];
      return a.indexOf(t)-b.indexOf(t);
    } else {
      return diff;
    }
  });
  $("#container").append(`<table id="configs"><tr></tr></table>`);
  //$("#configs").append(`<tr><td>${configs.join("</td></tr><tr><td>")}</td></tr>`);
  for (let i = 0; i < stage; i++) {
    let filter = configs.filter(r => r.indexOf("1") === i);
    
    let html = `<td><ul>`;
    let rstring = places.slice(6,stage);
    let bstring = rstring.split("").reverse().join("");
    let tittumsp = places.slice(stage-4,stage).split("").join("[1x]");
    let tittums = new RegExp(tittumsp);
    
    filter.forEach(r => {
      let queens, kings;
      if (stage === 8) {
        queens = r.indexOf("7") === 3 && r.indexOf("8") === 7;
        kings = r.indexOf("7") === 0 && r.indexOf("8") === 7;
      }
      let c = "";
      if (r.includes(rstring) || r.includes(bstring)) {
        c = ` class="highlightgreen"`;
      } else if (tittums.test(r) || queens || kings) {
        c = ` class="highlightblue"`;
      }
      html += `<li${c}>${r}</li>`;
    });
    html += `</ul></td>`;
    if (filter.length) {
      $("#configs tr").append(html);
    }
  }
  let rows = rowarr.map(r => rowstring(r));
  //rows.pop();
  //rows.unshift(places.slice(0,stage));
  stringrepetition = findrepetition(rows);
  //<th>segment</th><th>contents</th><th>row</th><th>rownum</th><th>row in lead</th>
  $("main").append(`<table id="reptable"><tr></tr></table>`);
  //repetitiontable();
  for (let i = 0; i < Math.ceil(rows.length/leadlength); i++) {
    let html = `<td><ul><li>`;
    let chunk = rows.slice(i*leadlength, (i+1)*leadlength);
    html += chunk.join(`</li><li>`);
    html += `</li></ul></td>`;
    $("#reptable tr").append(html);
  }
  $("#reptable").on("click", "li", reprowclick);

  
  $("#table").append(`<tr><th>row num</th><th>row</th><th>apart</th><th>consec</th></tr>`);
  let homeco = homecourseorder(stage);
  homeco.unshift(stage);
  for (let i = 0; i < leadlength; i++) {
    let r = rowarr[i];
    let obj = analyzecoursing(r);
    let data = analyzedistribution(obj);
    let maxdiff = Math.max(...data.counts.map(o => o.diff));
    let farthest = data.counts.find(o => o.diff === maxdiff).pp[0].sort((a,b) => a-b);
    let t = data.regular ? "regular" : "";
    let html = `<tr><td>${i+1}</td><td>`;
    let rstr = rowstring(r);
    let winc = 68/(r.length-1);
    let binc = 45/(r.length-1);
    let previ = homeco.indexOf(r[stage-1]);
    let last = homeco.length-1;
    //if (previ === homeco.length-1) previ = -1;
    let color = 1;
    let consecutive = 0;
    let maxconsec = 0;
    for (let j = 0; j < r.length; j++) {
      let n = r[j];
      if (n === 1) {
        html += "1";
        maxconsec = Math.max(maxconsec, consecutive);
        consecutive = 0;
      } else {
        let h = (n === stage || n%2 === 1) ? 91 : 248;
        let w = 15 + winc*(stage-n);
        let b = 52 - binc*(stage-n);
        //html += `<span style="background-color: hwb(${h} ${w}% ${b}%)">${rstr[j]}</span>`;
        let homei = homeco.indexOf(n);
        let di = Math.abs(homei-previ);
        
        if (di === 1 || ([0,last].includes(homei) && [0,last].includes(previ))) {
          consecutive++;
        } else {
          color *= -1;
          maxconsec = Math.max(maxconsec, consecutive);
          consecutive = 1;
        }
        let c = color === 1 ? "lightblue" : "lightgreen";
        html += `<span style="background-color: ${c}">${rstr[j]}</span>`;
        previ = homei;
      }
    }
    maxconsec = Math.max(maxconsec, consecutive);
    let cc = maxconsec > 2 ? maxconsec : "";
    let f = maxdiff > 4 ? farthest.join("&") : "";
    html += `</td><td>${f}</td><td>${cc}</td></tr>`;
    $("#table").append(html);
  }
}




// ************* BELLRINGING FUNCTIONS *************

function rowstring(r) {
  return r.map(n => places[n-1]).join("");
}

function bellnum(c) {
  return places.indexOf(c)+1;
}

//given array of places (may contain duplicates) and number of bells
//check exactly which places are represented
function checkused(pp, n) {
  let used = [];
  for (let p = 1; p <= n; p++) {
    if (pp.includes(p)) used.push(p);
  }
  return used;
}

//build plain bob course order
//does not include tenor
function homecourseorder(stage) {
  let home = [];
  for (let b = 2; b < stage; b+=2) {
    home.push(b);
    if (b < stage-1) home.unshift(b+1);
  }
  return home;
}

//rotate a coursing order to put the tenor first, and remove the tenor
function rotateco(co,n) {
  let i = co.indexOf(n);
  let rot = co.slice(i+1);
  if (i > 0) {
    rot.push(...co.slice(0,i));
  }
  return rot;
}

//build plain bob leadheads for stage n
//does not include rounds??
function plainleadheads(n) {
  let lhs = [];
  let co = homecourseorder(n);
  co.unshift(n);
  for (let i = 0; i < n-2; i++) {
    let row = [1];
    for (let b = 2; b <= n; b++) {
      let j = co.indexOf(b);
      let k = j - i - 1;
      if (k < 0) k = co.length + k;
      row.push(co[k]);
    }
    lhs.push(row);
  }
  return lhs;
}

//co should be an array that does not include the tenor!!!
//expectation is rowarr holds plain course, not including starting rounds
function buildcourse(co) {
  let home = homecourseorder(stage);
  let course = [];
  for (let i = 0; i < rowarr.length; i++) {
    let old = rowarr[i];
    let row = [];
    for (let p = 0; p < stage; p++) {
      if ([1,stage].includes(old[p])) {
        row.push(old[p])
      } else {
        let b = old[p];
        let j = home.indexOf(b);
        row.push(co[j]);
      }
    }
    if (tenor) row.push(stage+1);
    course.push(row);
  }
  return course;
}

//assuming plain course, list places in coursing order
function analyzecoursing(row) {
  let co = homecourseorder(stage);
  co.unshift(stage);
  let pp = [];
  for (let i = 0; i < co.length; i++) {
    let p = row.indexOf(co[i])+1;
    pp.push(p);
  }
  let res = {
    treble: row.indexOf(1)+1,
    order: pp
  };
  return res;
}

function analyzedistribution(o) {
  let pp = o.order;
  let one = 0;
  let two = 0;
  let other = 0;
  let counts = [];
  let d = Math.abs(pp[0]-pp[pp.length-1]);
  counts.push({diff: d, count: 1, pp: [[pp[0],pp[pp.length-1]]]});
  d === 1 ? one++ : d === 2 ? two++ : other++;
  for (let i = 1; i < pp.length; i++) {
    let diff = Math.abs(pp[i]-pp[i-1]);
    switch (diff) {
      case 1:
        one++;
        break;
      case 2:
        two++;
        break;
      default:
        other++;
    }
    let c = counts.find(obj => obj.diff === diff);
    if (c) {
      c.count++;
      c.pp.push([pp[i],pp[i-1]]);
    } else {
      counts.push({diff: diff, count: 1, pp: [[pp[i],pp[i-1]]]});
    }
  }
  let regular = [1,2].includes(one) && [0,1].includes(other);
  return {one: one, two: two, other: other, regular: regular, counts: counts};
}

function collectdata(r) {
  
  //hmmm how do I deal with consecutive chunks vs consecutive intervals...
  
  let data = {
    steps: findinterval(r, 1),
    thirds: findinterval(r, 2),
    oct: r.length > 8 ? findinterval(r, 7) : []
  };

  let combined = [];
  for (let key in data) {
    data[key].forEach(a => {
      combined.push(...a);
    });
  }
  //combined.sort((a,b) => a-b);
  let used = checkused(combined, r.length);
  ///*
  if (r.length > 7 && r.length%2 === 0) { //used.length < r.length && 
    let tonic = findtonicgroups(r);
    data.tonic = tonic;
    tonic.forEach(a => {
      if (a.length > 1) {
        a.forEach(p => {
          if (!used.includes(p)) used.push(p);
        });
      }
    });
  }
  //*/
  //tonic: r.length > 7 ? findtonic(r) : []
  data.used = used;
  if (used.length === r.length) {
    data.good = true;
  } else {
    data.compound = checkcompound(r);
  }
  return data;
}

//arr is an array of arrays of places
//if two chunks are consecutive, combine them into one chunk
function groupchunks(arr) {
  let res = [];
  let current = [];
  arr[0].forEach(n => current.push(n));
  let last = current[current.length-1];
  for (let i = 1; i < arr.length; i++) {
    let c = arr[i];
    if (c[0] === last+1) {
      current.push(...c);
    } else {
      res.push(current);
      current = [];
      current.push(...c);
    }
    last = current[current.length-1];
  }
  res.push(current);
  return res;
}

//take the results of collectdata, compare largest chunk and most places used
function comparesizes(o) {
  let maxused = 0;
  let maxkey;
  let largest = 0;
  let largekey;
  ["steps","thirds","oct","tonic"].forEach(key => {
    if (o[key]) {
      let sizes = o[key].map(a => a.length);
      let large = Math.max(...sizes);
      if (large > largest) {
        largest = large;
        largekey = key;
      }
      let sum = 0;
      sizes.forEach(n => sum += n);
      if (sum > maxused) {
        maxused = sum;
        maxkey = key;
      }
    }
  });
  return {maxused: maxused, maxkey: maxkey, largest: largest, largekey: largekey};
}

//arr is an array of arrays of places
function tallysizes(arr) {
  let sizes = [];
  arr.forEach(a => {
    let size = a.length;
    let o = sizes.find(e => e.size === size);
    if (o) {
      o.count++;
    } else {
      o = {
        size: size,
        count: 1
      };
      sizes.push(o);
    }
  });
  return sizes;
}

//calculate bell intervals
//r is array
function rowints(r, abs) {
  let ii = [];
  for (let i = 1; i < r.length; i++) {
    let d = r[i]-r[i-1];
    abs ? ii.push(Math.abs(d)) : ii.push(d);
  }
  return ii;
}

//find "runs" (actually just steps)
function findsteps(r) {
  let dd = rowints(r, true);
  
  let runs = [];
  let current = [];
  for (let i = 0; i < dd.length; i++) {
    let d = dd[i];
    if (d === 1) {
      if (current.length === 0) {
        current.push(i+1,i+2);
      } else {
        current.push(i+2);
      }
    } else {
      if (current.length) runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

//find instances of an interval, if consecutive group them together
//result is array of arrays with row places connected by the interval
function findinterval(r,int) {
  let dd = rowints(r, true);
  let runs = [];
  let current = [];
  for (let i = 0; i < dd.length; i++) {
    let d = dd[i];
    if (d === int) {
      if (current.length === 0) {
        current.push(i+1,i+2);
      } else {
        current.push(i+2);
      }
    } else {
      if (current.length) runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

//like the one below, but only keeps tonic bells that are consecutive
function findtonicgroups(r) {
  //r.length needs to be 8, 10, or 12
  let tt = tonictriad.find(o => o.stage === r.length).bells;
  let tonic = [];
  let current = [];
  let bells = [];
  for (let i = 0; i < r.length; i++) {
    let b = r[i];
    if (tt.includes(b)) {
      current.push(i+1);
      bells.push(b);
    } else {
      if (current.length > 1) {
        tonic.push(current);
      }
      current = [];
      bells = [];
    }
  }
  if (current.length > 1) {
    tonic.push(current);
  }
  return tonic;
}

//find tonic triad bells
//result is array of arrays with places in row of tonic triad bells
//any consecutive places will be in an array together
//on a given number of bells, all rows will have same total number of places in the result
//but different number of arrays depending on grouping
function findtonic(r) {
  //r.length needs to be 8, 10, or 12
  let tt = tonictriad.find(o => o.stage === r.length).bells;
  let tonic = [];
  let current = [];
  for (let i = 0; i < r.length; i++) {
    let b = r[i];
    if (tt.includes(b)) {
      current.push(i+1);
    } else {
      if (current.length) tonic.push(current);
      current = [];
    }
  }
  if (current.length) tonic.push(current);
  return tonic;
}

//this is a wide category of vaguely tittumsy things
//compound melody, each one is stepwise
//no consistency of alternation needed
//I think rows don't need to be sent here though if they're all steps
//do I care about a tenor behind?
function checkcompound(r) {
  let one = {
    places: [1],
    bells: [r[0]]
  };
  let two = {
    places: [],
    bells: []
  };
  let prev = 1;
  let compound = true;
  for (let i = 1; i < r.length; i++) {
    let d = r[i]-r[i-1];
    if (Math.abs(d) === 1) {
      let o = prev === 1 ? one : two;
      o.places.push(i+1);
      o.bells.push(r[i]);
      o.dir = d;
    } else {
      let o = prev === 1 ? two : one;
      if (o.bells.length === 0) {
        o.places.push(i+1);
        o.bells.push(r[i]);
        prev *= -1;
      } else {
        let last = o.bells[o.bells.length-1];
        let ld = r[i]-last;
        if (Math.abs(ld) === 1) {
          if (o.bells.length === 1 || ld === o.dir) {
            o.places.push(i+1);
            o.bells.push(r[i]);
            o.dir = ld;
            prev *= -1;
          } else {
            compound = false;
          }
        } else {
          compound = false;
        }
      }
    }
  }
  if (compound) console.log(rowstring(r));
  return compound ? [one,two] : null;
}

function findcopies(row, arr) {
  let orig = arr.indexOf(row);
  let others = [];
  let details = [];
  for (let j = stage-1; j >= 4; j--) {
    for (let start = 0; start <= stage-j; start++) {
      let string = row.slice(start, start+j);
      arr.forEach((r,i) => {
        if (r.includes(string)) {
          if (!others.includes(i) && orig != i) {
            others.push(i);
            let f = r.indexOf(string);
            details.push({rownum: i, start: f, length: j});
          }
        }
      });
    }
  }
  return details;
}

//good to have arr as strings
function findrepetition(arr) {
  let res = {};
  
  for (let j = stage-1; j >= 4; j--) {
    for (let i = 0; i <= leadlength; i++) {
      for (let start = 0; start <= stage-j; start++) {
        let string = arr[i].slice(start, start+j);
        let contains = Object.keys(res).filter(key => key.includes(string));
        
          let copies = [];
          for (let r = i+1; r < arr.length; r++) {
            if (arr[r].includes(string)) {
              if (!contains.some(s => arr[r].includes(s))) {
                copies.push({row: arr[r], rownum: r});
              }
              
            }
          }
          if (copies.length) {
            copies.unshift({row: arr[i], rownum: i});
            res[string] = copies;
          }
        
      }
    }
  }
  console.log(Object.keys(res).length + " repeated strings found");
  return res;
}

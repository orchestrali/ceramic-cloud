const places = "1234567890ET";
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
var url = "https://api.complib.org/";
//holder for rows from complib
var rowarr = [];
//features of current search
var stage;
var numbells;
var tenor;
var what;

var methodinfo = {};
var leadlength;

$(function() {
  console.log("ohhh argh");
  $("#submit").on("click", subcomplib);
});

//clear any previous stuff and figure out the current search
function subcomplib() {
  $("tbody").contents().detach();
  $("h3").detach();
  $("#container").contents().detach();
  $("#rowcolumn,#catcolumn").contents().detach();
  methodinfo = {};
  leadlength = null;
  if (!$("#summary").hasClass("hidden")) {
    $("#summary").addClass("hidden");
  }
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
        if (!leadlength && checkbit(results.rows[i][2],4)) {
          //at the first row that has the leadhead flag set, get this info
          leadlength = i-1;
          //console.log(leadlength);
          methodinfo.leadhead = rowstring(row);
        }
      }

      //not sure I actually need any of this
      if (what === "experiment") {
        //method experiment, showing musical traits of many courses
        
      } else if (what === "compexperiment") {
        
      } else {
        highlightgood();
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
  
  rows.forEach(h => {
    $("#rowcolumn").append(h);
  });
  
  cats.forEach(h => {
    $("#catcolumn").append(h);
  });
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
    if (data.good) goodcount++;
    if (data.compound) compound++;
    
    if (runs.length === 0) {
      let html = `<li>${rowstring(r)} </li>`;
      let cat = `<li class="fade">none</li>`;
      rowhtml.push(html);
      cathtml.push(cat);
    } else {
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

// ************* BELLRINGING FUNCTIONS *************

function rowstring(r) {
  return r.map(n => places[n-1]).join("");
}

function bellnum(c) {
  return places.indexOf(c)+1;
}

function collectdata(r) {
  
  //hmmm how do I deal with consecutive chunks vs consecutive intervals...
  

  let data = {
    steps: findinterval(r, 1),
    thirds: findinterval(r, 2),
    oct: r.length > 8 ? findinterval(r, 7) : [],
    tonic: r.length > 7 ? findtonic(r) : []
  };

  let combined = [];
  for (let key in data) {
    data[key].forEach(a => {
      combined.push(...a);
    });
  }
  //combined.sort((a,b) => a-b);
  let used = [];
  for (let p = 1; p <= r.length; p++) {
    if (combined.includes(p)) used.push(p);
  }
  data.used = used;
  if (used.length === r.length) {
    data.good = true;
  } else {
    data.compound = checkcompound(r);
  }
  return data;
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



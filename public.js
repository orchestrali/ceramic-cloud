const places = "1234567890ET";
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
    console.log(what);
    getcomplib(num, ["composition","compexperiment"].includes(what) ? "composition" : "method");
  }
}

//get rows
function getcomplib(compid, w) {
  var xhr = new XMLHttpRequest();
  
  xhr.open('GET', url+w+"/"+compid+"/rows", true);
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
        analyzesteps();
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

//examine each row for steps and highlight them
function analyzesteps() {
  let rowhtml = [];
  let cathtml = [];
  rowarr.forEach(r => {
    let runs = findsteps(r);
    
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
}

// ************* BELLRINGING FUNCTIONS *************

function rowstring(r) {
  return r.map(n => places[n-1]).join("");
}

function bellnum(c) {
  return places.indexOf(c)+1;
}

//calculate bell intervals
//r is array
function rowints(r, abs) {
  let ii = [];
  for (let i = 1; i <= r.length; i++) {
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
  return runs;
}

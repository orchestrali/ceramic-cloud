const places = "1234567890ETABCD";
const stagenames = ["Minor", "Major", "Royal", "Maximus"];
//complib api url for getting methods
var url = "https://api.complib.org/";
//method or composition
var comptype;
//holder of music scheme
var complibscheme;
//
var myscheme;
//
var schemerows = {};


$(function() {
  getschemes();
  $("#schemerows").on("click", schemerowsclick);
});



//just get both ... when they both exist
function getschemes() {
  $.get("complibscheme.json", function(body) {
    complibscheme = body;
    //$.get("") ????
  });
}

function schemerowsclick() {
  $("h3").text("");
  scheme = $(`input[name="scheme"]:checked`).val();
  let stage = Number($(`input[name="stage"]:checked`).val());
  if (scheme === "complib" && stage > 0) {
    buildcomplibrows(stage);
    $("tbody").contents().remove();
    let count = 0;
    for (let row in schemerows) {
      let tr = buildtablerow(row);
      $("tbody").append(tr);
      count++;
    }
    console.log(count);
    let num = (stage-6)/2;
    let text = stagenames[num] + " rows with points";
    $("h3").text(text);
  }
}


function buildcomplibrows(stage) {
  schemerows = {};
  let filter = complibscheme.filter(o => o.stage === stage);
  filter.forEach(o => {
    let set = [];
    let rows = [];
    let pp = [];
    let front = [];
    let back = [];
    if (o.pattern.length === stage) {
      o.pattern.includes("x") ? set.push(o.pattern) : rows.push(o.pattern);
      for (let i = 0; i < stage; i++) {
        if (o.pattern[i] != "x") pp.push(i+1);
      }
    } else {
      let x = "";
      let num = stage - o.pattern.length;
      for (let i = 0; i < num; i++) {
        x += "x";
      }
      set.push(o.pattern+x, x+o.pattern);
      for (let i = 0; i < o.pattern.length; i++) {
        front.push(i+1);
        back.unshift(stage-i);
      }
    }
    set.forEach(p => {
      let rr = getrowsfrompattern(p);
      rows.push(...rr);
    });
    rows.forEach(r => {
      let parr = set.length < 2 ? pp : r.startsWith(o.pattern) ? front : back;
      if (schemerows[r]) {
        schemerows[r].points++;
      } else {
        schemerows[r] = {points: 1, places: []};
      }
      parr.forEach(p => {
        if (!schemerows[r].places.includes(p)) schemerows[r].places.push(p);
      });
    });
  });
}


//given a row in string form, build the table row
//row with any highlighting, num points
function buildtablerow(r) {
  let o = schemerows[r];
  let tr = `<tr><td>`;
  if (o) {
    o.places.sort((a,b) => a-b);
    let span;
    for (let i = 1; i <= r.length; i++) {
      if (o.places.includes(i)) {
        if (!span) tr += `<span class="green">`;
        span = true;
      } else {
        if (span) tr += `</span>`;
        span = false;
      }
      tr += r[i-1];
    }
    if (span) tr += `</span>`;
    tr += `</td><td>${o.points}</td></tr>`;
  } else {
    tr += r + `</td><td>0</td></tr>`;
  }
  return tr;
}


//type: method or composition
function getcomplib(id, type) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url+type+"/"+id+"/rows", true);
  xhr.send();

  xhr.onload = function() {
    let results = JSON.parse(xhr.responseText);
  }
}








//pattern must be a row where some places are "x"
//no patterns shorter than the stage
function getrowsfrompattern(pattern) {
  let rows = [];
  //holder for bells represented by x
  let v = [];
  let rounds = places.slice(0, pattern.length);
  for (let i = 0; i < rounds.length; i++) {
    if (!pattern.includes(rounds[i])) {
      v.push(rounds[i]);
    }
  }
  if (v.length) {
    let extent = v.length === 1 ? v : buildextent(v);
    for (let i = 0; i < extent.length; i++) {
      let row = [];
      let sub = extent[i];
      let k = 0;
      for (let j = 0; j < pattern.length; j++) {
        let c = pattern[j];
        if (c === "x") {
          row.push(sub[k]);
          k++;
        } else {
          row.push(c);
        }
      }
      rows.push(row.join(""));
    }
  } else {
    rows.push(pattern);
  }
  return rows;
}


function buildextent(r) {
  let n = r.length;
  let arr = [];
  if (n === 2) {
    return extenttwo(r);
  } else if (n < 13) {
    for (let i = 0; i < n; i++) {
      let others = [];
      for (let j = 0; j < n; j++) {
        if (j != i) others.push(r[j]);
      }
      
      let ends = buildextent(others);
      ends.forEach(a => {
        a.unshift(r[i]);
        arr.push(a);
      });
    }
  }
  
  return arr;
}


function extenttwo(r) {
  let arr = [r,[r[1],r[0]]];
  return arr;
}


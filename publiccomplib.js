const places = "1234567890ETABCD";
const stagenames = ["Minor", "Major", "Royal", "Maximus"];
//complib api url for getting methods
var url = "https://api.complib.org/";
//method or composition
var comptype;
//holder of complib default music scheme
var complibscheme;
//
var myscheme;
//keys are rowstrings, values are objects with points (number) and places (array of numbers, indication of what to highlight)
var schemerows = {};

//holder for composition/method rows
var comprows;


$(function() {
  getschemes();
  
});



//just get both ... when they both exist
function getschemes() {
  $.get("complibscheme.json", function(body) {
    complibscheme = body;
    $.get("alisonscheme.json", function(arr) {
      myscheme = arr;
      //attach listener when schemes are fetched
      $("#schemerows,#viewcomp").on("click", router);
    }); 
  });
}

function router(e) {
  $("h3").text("");
  $("tbody").contents().remove();
  $("table").hide();
  let scheme = $(`input[name="scheme"]:checked`).val();
  let id = e.currentTarget.id;
  if (scheme) {
    switch (id) {
      case "schemerows":
        let stageval = $(`input[name="stage"]:checked`).val();
        let stage = stageval ? Number(stageval) : 0;
        if (stage > 0) {
          //myscheme isn't finished yet...
          if (scheme === "complib" || [6,8].includes(stage)) {
            schemerowsclick(scheme);
          }
        }
        break;
      case "viewcomp":
        let complibid = $("#complibid").val();
        let comptype = $('input[name="idtype"]:checked').val();
        if (comptype && complibid.length) {
          getcomplib(complibid, comptype, scheme);
        }
        break;
    }
  }
}

function schemerowsclick(scheme) {
  scheme === "complib" ? buildcomplibrows(stage) : buildschemerows(stage);
  
  let count = 0;
  for (let row in schemerows) {
    let tr = buildtablerow(row);
    $("#schemetable tbody").append(tr);
    count++;
  }
  console.log(count);
  let num = (stage-6)/2;
  let text = stagenames[num] + " rows with points";
  $("h3").text(text);
  $("#schemetable").show();
}

//different from complib because shorter patterns can be anywhere in the row
function buildschemerows(stage) {
  schemerows = {};
  let filter = myscheme.filter(o => o.stage === stage);
  filter.forEach(o => {
    //objects with pattern containing x and places to highlight
    let set = [];
    //objects with whole row and places to highlight
    let rows = [];
    
    //exact rows go into rows, otherwise build set
    if (o.pattern.length === stage) {
      let pp = [];
      for (let i = 0; i < stage; i++) {
        if (o.pattern[i] != "x") pp.push(i+1);
      }
      o.pattern.includes("x") ? set.push({pattern: o.pattern, places: pp}) : rows.push({row: o.pattern, places: pp});
    } else {
      let patts = patternstage(o.pattern, stage);
      patts.forEach(p => {
        let pp = p.map((e,i) => e === "x" ? 0 : i+1).filter(n => n > 0);
        set.push({pattern: p, places: pp});
      });
    }
    //build rows from set
    set.forEach(s => {
      let rr = getrowsfrompattern(s.pattern);
      rr.forEach(r => rows.push({row: r, places: s.places}));
    });
    //add to scheme
    //adjust here if using different numbers of points
    rows.forEach(ro => {
      let r = ro.row;
      if (schemerows[r]) {
        schemerows[r].points++; //
      } else {
        schemerows[r] = {points: 1, places: []};
      }
      ro.places.forEach(p => {
        if (!schemerows[r].places.includes(p)) schemerows[r].places.push(p);
      });
    });
    
  });
}


function buildcomplibrows(stage) {
  schemerows = {};
  let filter = complibscheme.filter(o => o.stage === stage);
  filter.forEach(o => {
    //rows where some bells are "x"
    let set = [];
    //exact whole rows
    let rows = [];
    //places to highlight
    let pp = [];
    //front and back places to highlight, for substrings counted at both
    let front = [];
    let back = [];
    //exact rows go into rows, otherwise build set; build pp or front and back
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
    //build rows from set
    set.forEach(p => {
      let rr = getrowsfrompattern(p);
      rows.push(...rr);
    });
    //set length 0: exact row; set length 1: row with x; set length 2: front and back;
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
//compositions/methods need a row number
//row with any highlighting, num points
function buildtablerow(r, rn) {
  let o = schemerows[r];
  let tr = `<tr>`;
  if (rn) tr += `<td>${rn}</td>`;
  tr += `<td class="row">`;
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
function getcomplib(id, type, scheme) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url+type+"/"+id+"/rows", true);
  xhr.send();

  xhr.onload = function() {
    let results = JSON.parse(xhr.responseText);
    comprows = [];
    if (results.rows) {
      $("h3").text(results.title);
      let stage = results.stage;
      if ([6,8].includes(stage) || (scheme === "complib" && [6,8,10,12].includes(stage))) {
        scheme === "complib" ? buildcomplibrows(stage) : buildschemerows(stage);
        
        for (let i = 2; i < results.rows.length; i++) {
          let row = results.rows[i][0];
          let tr = buildtablerow(row, i-1);
          $("#comptable tbody").append(tr);
        }
        $("#comptable").show();
      } else {
        console.log("stage: "+stage);
      }
    }
  }
}




//add x around pattern to make something of length stage
function patternstage(pattern, stage) {
  let n = pattern.length;
  let res = [];
  for (let i = 0; i <= stage-n; i++) {
    let p = "";
    for (let j = 0; j < stage; j++) {
      if (j < i || j >= i+n) {
        p += "x";
      } else if (j === i) {
        p += pattern;
      }
    }
    res.push(p);
  }
  return res;
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


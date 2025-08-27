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


// ************* BELLRINGING FUNCTIONS *************

function rowstring(r) {
  return r.map(n => places[n-1]).join("");
}

function bellnum(c) {
  return places.indexOf(c)+1;
}


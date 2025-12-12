const places = "1234567890ETABCD";
const stagenames = ["Doubles","Minor","Triples","Major","Caters","Royal", "Cinques","Maximus","Sextuples","Fourteen","Septuples","Sixteen"];
//complib api url for getting methods & compositions
var url = "https://api.complib.org/";
const tableheads = ["Mask", "Description", "Category", "Type", "Stroke", "Possible", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"];
var schemerules = [];
var categorynames = [];
var categorystats = [];






$(function() {
  buildinitialtables();
  buildinitialrules();

  $("#downloadcsv").on("click", downloadfile);
  $("#addpattern").on("click", addschemerule);
  $("#patternentry").on("keydown", patternkeydown);
  $("#viewcomp").on("click", viewcomp);
  $("#reporttable").on("click", ".reportcat", reportcatclick);
});



// *** actions ***

//clear error info
function patternkeydown() {
  $("#addinginfo").text("");
}

function stageclick(e) {
  $(e.currentTarget).next().toggle();
}

function removerowclick(e) {
  $(e.currentTarget).parent("tr").remove();
}

function removestagerules(e) {
  let stage = Number(e.currentTarget.id.slice(5));
  //remove table rows
  $("#stage"+stage+" tbody tr").remove();
  //remove saved rules
  let o = schemerules.find(obj => obj.stage === stage);
  o.rules = [];
}

function viewcomp() {
  //clear previous
  $("h3").text("");
  $("#totals").text("");
  $("#comptable tbody,#reporttable tbody").contents().remove();
  $("#compdisplay").hide();
  
  let complibid = $("#complibid").val();
  let comptype = $('input[name="idtype"]:checked').val();
  if (comptype && complibid.length) {
    $("#loading").show();
    getcomplib(complibid, comptype);
  } else {
    //mention problem???
  }
}

function reportcatclick(e) {
  let c = e.currentTarget.id.slice(6);
  $("."+c).toggle();
}


// ******* main purpose of this website *******

function addschemerule() {
  let stage = Number($("#stage option:checked").val());
  let rounds = places.slice(0, stage);
  let chars = rounds + "x()";
  let pattern = $("#patternentry").val();
  let p = replacebellletters(pattern);
  let set = [p];
  if (p.includes("(")) set = handlepatterns(p);
  let parr = p.split("");
  if (parr.some(c => !chars.includes(c)) || set.length === 0) {
    //invalid pattern
    $("#addinginfo").text("pattern not valid");
  } else if (pattern.length) {
    let o = {
      pattern: pattern,
      locations: "",
      points: Number($("#points").val())
    };
    let descript = $("#patterndescript").val();
    if (descript.length) o.description = descript;
    let ocat = $("#patterncat").val();
    if (ocat.length) {
      o.category = ocat;
      if (!categorynames.includes(ocat)) categorynames.push(ocat);
    }
    ["front","middle","back"].forEach(w => {
      if ($("#"+w).is(":checked")) {
        o.locations += w[0];
      }
    });
    let stroke = $("#stroke option:checked").text();
    if (stroke != "Any") o.stroke = stroke;
    if ($("#transpose").is(":checked")) o.transpose = true;
    
    let set = schemerules.find(obj => obj.stage === stage);
    set.rules.push(o);
    
    //add to the actual table
    let tablerows = convertrule(o, stage);
    tablerows.forEach(tr => {
      let html = buildtablerow(tr, stage);
      $("#stage"+stage+" tbody").append(html);
    });
    //table no longer sorted
    ["sorttable_sorted","sorttable_sorted_reverse"].forEach(c => {
      $("#stage"+stage+" th."+c).removeClass(c);
    });
    //inform user
    $("#patternentry").val("");
    $("#addinginfo").text("Added!");
    setTimeout(() => {
      $("#addinginfo").text("");
    }, 1000);
  }
  
}


//convert one of my "rules" to complib spreadsheet rows
function convertrule(r, stage) {
  let tablerows = [];
  if (!categorynames.includes(r.category)) {
    categorynames.push(r.category);
  }
  let set = [];
  let p = r.pattern;
  //pattern has parentheses
  if (p.includes("(")) {
    //expand to multiple rows
    let pp = handlepatterns(p);
    pp.forEach(pat => {
      let o = {pattern: pat};
      for (let key in r) {
        if (key != "pattern") o[key] = r[key];
      }
      set.push(o);
    });
  } else {
    set.push(r);
  }
  //pattern transpositions
  if (r.transpose) {
    //expand to multiple rows
    //could already be working with multiple rows from parentheses
    set.forEach(o => {
      let tt = transpose(o.pattern, stage);
      tt.forEach(t => {
        let tr = {pattern: t};
        for (let key in o) {
          if (key != "pattern") tr[key] = o[key];
        }
        tablerows.push(tr);
      });
    });
  } else {
    tablerows.push(...set);
  }
  return tablerows;
}

//r is an object with the info needed for a single table row
function buildtablerow(r, stage, num) {
  let p = r.pattern;
  let cols = [p, p];
  /*
  if (r.description) {
    cols.push(r.description);
  } else {
    cols.push(p+"s");
  }
  */
  cols.push(r.category || "");
  //type
  cols.push(p.length === stage ? "Row" : "Mask");
  //stroke
  cols.push(r.stroke || "Any");
  //possible
  let possible;
  if (p.length === stage) {
    let x = p.split("").filter(c => c === "x");
    possible = x.length === 0 ? 1 : factorial(x.length);
  } else {
    let others = stage-p.length;
    possible = 0;
    if (r.locations.includes("f")) {
      possible += factorial(others);
    }
    if (r.locations.includes("b")) {
      possible += factorial(others);
    }
    if (r.locations.includes("m")) {
      let f = others-1;
      possible += factorial(others)*f;
    }
  }
  cols.push(possible);
  if (possible > 1) cols[1] += "[s]";
  if (r.description) cols[1] += " "+r.description;
  //scores
  if (r.locations.length === 3) {
    cols.push(r.points, 0, 0, 0);
  } else {
    cols.push(0);
    ["f", "m", "b"].forEach(c => {
      cols.push(r.locations.includes(c) ? r.points : 0);
    });
  }
  // id="stage${stage}-${num}"
  //actually turn cols into a table row
  let html = `<tr><td>`+cols.join("</td><td>")+`</td><td class="remove">x</td></tr>`;
  return html;
  //or just return cols?
}




// **** applying the scheme ****


//row is an actual bell row
//pattern may be: actual row or row with x's
//both strings!!
//returns places in the row (1-indexed) where the pattern occurs
function testrow(row, pattern) {
  if (row.includes(pattern)) {
    //this should now only happen for whole row matches...
    let start = row.indexOf(pattern);
    let pp = places.slice(start, start+pattern.length).split("").map(bellnum);
    return pp;
  }
  if (row.length === pattern.length && pattern.includes("x")) {
    let match = true;
    let i = 0;
    let pp = [];
    while (match && i < row.length) {
      match = pattern[i] === "x" || row[i] === pattern[i];
      if (row[i] === pattern[i]) pp.push(i+1);
      i++;
    }
    return match ? pp : [];
  }
  return [];
}


function buildcomptablerow(rn, row, pp, points, cat) {
  let tr = `<tr><td>${rn}</td><td class="row">`;
  let span;
  for (let i = 1; i <= row.length; i++) {
    if (pp.includes(i)) {
      if (!span) tr += `<span class="green">`;
      span = true;
    } else {
      if (span) tr += `</span>`;
      span = false;
    }
    tr += row[i-1];
  }
  if (span) tr += `</span>`;
  
  tr += `</td><td>${points}</td><td>${pp.length}</td><td>${cat}</td></tr>`;
  return tr;
}

//rows of a method or composition, obtained from complib
function displaycomp(rows, stage) {
  let patterns = buildstagepatterns2(stage);
  let count = 0;
  let totalpoints = 0;
  let report = {
    Category: {},
    Description: {}
  };
  let catpoints = {};
  for (let i = 2; i < rows.length; i++) {
    let row = rows[i][0];
    let pp = [];
    let points = 0;
    let cat = "";
    //some rows can match multiple categories; collect them all
    let cats = [];
    patterns.forEach(obj => {
      let pl = testrow(row, obj.Mask);
      if (pl.length && obj.points) {
        cats.push({cat: obj.Category, numplaces: pl.length});
        points += obj.points;
        pl.forEach(n => {
          if (!pp.includes(n)) pp.push(n);
        });
      }
      if (pl.length) {
        ["Category","Description"].forEach(w => {
          let o = report[w][obj[w]];
          if (o) {
            o.Score += obj.points;
            o.Count++;
            if (obj.loc != "whole") o[obj.loc]++;
          } else {
            o = {
              Score: obj.points,
              Count: 1
            };
            if (obj.loc != "whole") {
              o.parts = true;
              ["Front","Internal","Back"].forEach(loc => o[loc] = 0);
              o[obj.loc]++;
            }
            if (w === "Category") o.descripts = [obj.Description];
            report[w][obj[w]] = o;
          }
        });
        let catdesc = report.Category[obj.Category].descripts;
        if (!catdesc.includes(obj.Description)) {
          catdesc.push(obj.Description);
        }
      }
    });
    if (points) {
      if (cats.length) {
        cats.sort((a,b) => b.numplaces-a.numplaces);
        cat = cats[0].cat;
        if (catpoints[cat]) {
          catpoints[cat] += points;
        } else {
          catpoints[cat] = points;
        }
      }
      pp.sort((a,b) => a-b);
      count++;
      totalpoints += points;
    }
    //brackets for plurals
    let cattext = handleplural(cat);
    //add the comprow to the table
    let tr = buildcomptablerow(i-1, row, pp, points, cattext);
    $("#comptable tbody").append(tr);
  }
  //console.log("total points: "+totalpoints);
  //console.log(catpoints);
  //console.log(report);
  buildcompreport(report);
  let totaltext = `${count} rows with points, ${totalpoints} points in total`;
  $("#totals").text(totaltext);
  $("#compdisplay").show();
}


function buildreportrow(name, o) {
  let cols = [handleplural(name, true)];
  if (o.parts) {
    ["Front","Internal","Back"].forEach(w => {
      cols.push(o[w]);
    });
  } else {
    cols.push("", "", "");
  }
  cols.push(o.Count, o.Score);
  return cols;
}

function buildcompreport(report) {
  
  let i = 1;
  for (let cat in report.Category) {
    let o = report.Category[cat];
    let cols = buildreportrow(cat, o);
    
    let tr = `<tr id="reportcat${i}" class="reportcat"><td>` + cols.join(`</td><td>`) + `</td></tr>`;
    //add the table row
    $("#reporttable tbody").append(tr);
    
    o.descripts.forEach(desc => {
      let d = report.Description[desc];
      let cells = buildreportrow(desc, d);
      let row = `<tr class="subcat cat${i}"><td>` + cells.join(`</td><td>`) + `</td></tr>`;
      $("#reporttable tbody").append(row);
    });
    
    i++;
  }
  
}



//complib id, type method or composition
function getcomplib(id, type) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url+type+"/"+id+"/rows", true);
  xhr.send();

  xhr.onload = function() {
    $("#loading").hide();
    let results = JSON.parse(xhr.responseText);

    if (results.rows) {
      $("h3").text(results.title);
      let stage = results.stage;
      displaycomp(results.rows, stage);
    } else {
      //something is wrong?
      console.log(results);
    }
  }
}












// **** downloading csv version ****

function buildcsv() {
  //probably rebuild summaries first??
  categorysummarize();
  
  let header = ["Id", "SchemeId", "Stage", "Sequence", "Mask", "Description", "Summarise", "Type", "Stroke", "Possible", "Minimum", "Maximum", "Factor", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"].join(",");
  
  let texts = {
    odd: ``,
    even: `
`
  };
  let ids = {odd: 1001, even: 1}
  
  for (let stage = 5; stage <= 16; stage++) {
    let odd = stage % 2 === 1;
    let idkey = odd ? "odd" : "even";
    let catobj = categorystats.find(o => o.stage === stage);
    if (catobj) {
      catobj.categories.forEach((o,i) => {
        let list = o.seqids.map(n => Number(n));
        let lstring = '"'+o.seqids[0];
        let current = [];
        
        for (let j = 1; j < list.length; j++) {
          if (list[j]-list[j-1] === 1) {
            current.push(j);
          } else {
            if (current.length) lstring += "-" + o.seqids[j-1];
            lstring += "," + o.seqids[j];
            current = [];
          }
        }
        if (current.length) lstring += "-" + o.seqids[current[current.length-1]];
        lstring += '"';
        //'"'+ o.seqids.join(",") +'"'
        //ids[idkey]
        //leaving Id column blank; can just be automatically numbered in the spreadsheet
        let row = ["", "", stage, i+1, lstring, o.name, "0", "Subtotal", "Any", "0","0","0","0","0","0","0","0"];
        texts[idkey] += row.join(",") + `
`;
        ids[idkey]++;
      });
    }
    
    let rows = gettablerows(stage);
    rows.forEach((r,i) => {
      let row = ["", "", stage, r.seq, r.Mask, r.Description, "0", r.Type, r.Stroke, r.Possible, "0", "", "1", r.Score, r.ScoreFront, r.ScoreInternal, r.ScoreBack];
      texts[idkey] += row.join(",") + `
`;
      ids[idkey]++;
    });
  }
  let full = header + texts.even + texts.odd;
  return full;
}


function downloadfile() {
  let file = buildcsv();
  
  const a = document.createElement('a');
  const blob = new Blob([file], {type: "text/plain"});
  a.href = URL.createObjectURL(blob);
  a.download = "my-complib-tests.csv";
  a.click();
  
  URL.revokeObjectURL(a.href);
}



// **** processing scheme rows ****

function gettablerows(stage) {
  let oo = [];
  let num = $("#stage"+stage+" tbody tr").length;
  for (let i = 1; i <= num; i++) {
    let tr = $("#stage"+stage+" tbody tr:nth-child("+i+")");
    let obj = {seq: (i+99).toString()};
    for (let j = 0; j < tableheads.length; j++) {
      obj[tableheads[j]] = tr.children("td:nth-child("+(j+1)+")").text();
    }
    oo.push(obj);
  };
  return oo;
}

function categorysummarize() {
  categorystats = [];
  for (let stage = 5; stage <= 16; stage++) {
    let res = {
      stage: stage
    };
    let rows = gettablerows(stage);
    let cats = [];
    
    categorynames.forEach(cn => {
      let catrows = rows.filter(o => o.Category === cn);
      if (catrows.length) {
        let cat = {
          name: cn,
          seqids: catrows.map(o => o.seq),
          totalpoints: 0
        };
        catrows.forEach(r => {
          let numbers = [];
          ["Possible", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"].forEach(w => numbers.push(Number(r[w])));
          if (numbers[1]) {
            cat.totalpoints += numbers[0]*numbers[1];
          } else {
            let total = Math.max(...numbers.slice(2))*numbers[0];
            cat.totalpoints += total;
          }
        });
        //eventually figure out how to count bell rows in the category
        cats.push(cat);
      }
    });
    cats.sort((a,b) => Number(a.seqids[0])-Number(b.seqids[0]));
    res.categories = cats;
    res.maxpoints = 0;
    cats.map(o => o.totalpoints).forEach(n => res.maxpoints += n);
    categorystats.push(res);
  }
}


//doesn't have to be related to categories
//take a table row and produce separate patterns if front, internal, and back aren't all checked
function catrowpatterns(catrow, stage) {
  let pattern = catrow.Mask;
  let partscores = ["ScoreFront", "ScoreInternal", "ScoreBack"].map(w => catrow[w]);
  let pp = [];
  if (pattern.length === stage || !partscores.includes("0")) {
    pp.push(pattern);
  } else {
    let x = "xxxxxxxxxxxxxxxxxxxxxxxxx".slice(0, stage-pattern.length);
    if (partscores[0] != "0") {
      pp.push(pattern+x);
    }
    if (partscores[2] != "0") {
      pp.push(x+pattern);
    }
    if (partscores[1] != "0") {
      for (let i = 1; i < x.length; i++) {
        let p = x.slice(0,i) + pattern + x.slice(i);
        pp.push(p);
      }
    }
  }
  return pp;
}

//build front, internal, and back even if they don't get points, because they'll still be counted
function partialpatterns(tablerow, stage) {
  let pattern = tablerow.Mask;
  let pp = [];
  if (tablerow.Type === "Row") {
    pp.push({Mask: pattern, loc: "whole", points: Number(tablerow.Score)});
  } else {
    let x = "xxxxxxxxxxxxxxxxxxxxxxxxx".slice(0, stage-pattern.length);
    let partscores = ["ScoreFront", "ScoreInternal", "ScoreBack"].map(w => Number(tablerow[w]));
    pp.push({Mask: pattern+x, loc: "Front", points: partscores[0]});
    pp.push({Mask: x+pattern, loc: "Back", points: partscores[2]});
    for (let i = 1; i < x.length; i++) {
      let p = x.slice(0,i) + pattern + x.slice(i);
      pp.push({Mask: p, loc: "Internal", points: partscores[1]});
    }
  }
  return pp;
}

//returned patterns now have "points" and "loc"
function buildstagepatterns2(stage) {
  let trr = gettablerows(stage);
  let patterns = [];
  trr.forEach(tr => {
    let oo = partialpatterns(tr, stage);
    oo.forEach(o => {
      for (let key in tr) {
        if (key != "Mask") o[key] = tr[key];
      }
      patterns.push(o);
    });
  });
  return patterns;
}

//convert so that each test/mask/pattern/whatever only has one "points" field
function buildstagepatterns(stage) {
  let trr = gettablerows(stage);
  let patterns = [];
  trr.forEach(tr => {
    let pp = catrowpatterns(tr, stage);
    pp.forEach(p => {
      let o = {
        Mask: p
      };
      let numbers = ["Score", "ScoreFront", "ScoreInternal", "ScoreBack"].map(w => Number(tr[w]));
      o.points = Math.max(...numbers);
      for (let key in tr) {
        if (!["Mask", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"].includes(key)) {
          o[key] = tr[key];
        }
      }
      patterns.push(o);
    });
  });
  return patterns;
}






// **** INITIAL SETUP ****

//builds runs and some named rows for each stage, same parameters as complib default scheme
function buildinitialrules() {
  let strs = ["1234","4321"];
  //not using this but keeping as model??
  let runs = [{pattern: "1234", locations: "fb", points: 1, category: "4-bell run[s]", transpose: true},
             {pattern: "4321", locations: "fb", points: 1, category: "4-bell run[s]", transpose: true}];
  for (let s = 5; s <= 16; s++) {
    let set = {
      stage: s,
      rules: []
    };
    strs.forEach(p => {
      let o = {
        pattern: p,
        locations: "fb",
        points: 1,
        category: p.length+"-bell run[s]",
        transpose: true
      };
      set.rules.push(o);
    });
    let rounds = places.slice(0,s);
    let backrounds = rounds.split("").reverse().join("");
    set.rules.push({pattern: rounds, locations: "fmb", points: 1, description: "(Rounds)", category: "Named row[s]"});
    set.rules.push({pattern: backrounds, locations: "fmb", points: 1, description: "(Backrounds)", category: "Named row[s]"});
    
    let queensy = buildqueens(s);
    let tittums = buildtittums(s);
    for (let name in tittums) {
      queensy[name] = tittums[name];
    }
    for (let name in queensy) {
      let o = {
        pattern: queensy[name],
        locations: "fmb",
        points: 1,
        description: "("+name+")",
        category: "Named row[s]"
      };
      set.rules.push(o);
    }
    schemerules.push(set);
    
    strs.push(rounds, backrounds);
  }

  buildinitialtablebodies();
}

function buildinitialtables() {
  for (let s = 5; s <= 16; s++) {
    let name = stagenames[s-5];
    let html = `<div class="stagescheme" id="stage${s}">
      <p>${name}</p>
      <div class="tcontainer">
        <button class="clearrows" id="clear${s}" type="button">Delete all</button>
      </div>
    </div>`;
    $("#schemetables").append(html);
  }
  let table = `<table>
        <thead>
          <th>${tableheads.join("</th><th>")}</th>
        </thead>
        <tbody>
        </tbody>
      </table>`;
  $(".tcontainer").append(table);
  $(".stagescheme p").on("click", stageclick);
  $("table").on("click", ".remove", removerowclick);
  $(".clearrows").on("click", removestagerules);
}

function buildinitialtablebodies() {
  for (let s = 5; s <= 16; s++) {
    buildschemetable(s);
  }
  $("#downloadcsv").show();
  categorysummarize();
}

function buildschemetable(stage) {
  let list = schemerules.find(o => o.stage === stage);
  if (list) {
    let rules = list.rules;
    
    let categories = [];
    
    let tablerows = [];
    
    rules.forEach(r => {
      let rows = convertrule(r, stage);
      tablerows.push(...rows);
    });
    let id = "#stage"+stage+" tbody";
    tablerows.forEach((r,i) => {
      let row = buildtablerow(r, stage, i+100);
      $(id).append(row);
    });
    $("#stage"+stage+" table").addClass("sortable");
  }
}




// *** weird utilities *** 

function factorial(n) {
  for (let i = n-1; i > 1; i--) {
    n *= i;
  }
  return n;
}

//capitalize
function replacebellletters(p) {
  let arr = p.split("");
  for (let i = 0; i < arr.length; i++) {
    let c = arr[i];
    if ("etabcd".includes(c)) {
      arr.splice(i, 1, c.toUpperCase());
    }
  }
  return arr.join("");
}

function handleplural(text, plural) {
  let i = text.indexOf("[");
  let j = text.indexOf("]");
  let arr = text.split("");
  if (i > -1 && j > -1 && j > i) {
    if (plural) {
      arr.splice(j,1);
      arr.splice(i,1);
    } else {
      let count = j-i+1;
      arr.splice(i, count);
    }
  }
  return arr.join("");
}










// **** BELLRINGING FUNCTIONS ****

//convert bell characters to numbers
function bellnum(n) {
  return places.indexOf(n)+1;
}

//convert array of bell numbers to string of characters
function rowstring(arr) {
  let r = arr.map(n => places[n-1]);
  return r.join("");
}


function transpose(p, stage) {
  let arr = p.split("").map(bellnum);
  let min = Math.min(...arr);
  let max = Math.max(...arr);
  let patterns = [];
  for (let i = min-1; i <= stage-max; i++) {
    let t = [];
    for (let j = 0; j < p.length; j++) {
      t.push(arr[j]+i);
    }
    patterns.push(rowstring(t));
  }
  return patterns;
}


//actually does kings + queens + princes + princesses
function buildqueens(stage) {
  let kings = [];
  for (let i = 2; i <= stage+1; i+=2) {
    if (i <= stage) kings.push(i);
    kings.unshift(i-1);
  }
  let front = kings.slice(0, Math.ceil(stage/2));
  let l = front.length;
  front.reverse();
  let queens = front.concat(kings.slice(l));
  
  let rows = {
    Kings: rowstring(kings),
    Queens: rowstring(queens)
  };
  let princes = kings;
  princes.splice(l, 1);
  princes.splice(l-1, 0, 2);
  rows.Princes = rowstring(princes);
  if (stage > 6) {
    queens.splice(l, 1);
    queens.splice(l-1, 0, 2);
    rows.Princesses = rowstring(queens);
  }
  return rows;
}


function buildtittums(stage) {
  let l = Math.ceil(stage/2);
  let top = places.slice(0,l);
  let bottom = places.slice(l, stage);
  let revtop = top.split("").reverse().join("");
  let tittums = "";
  let exploded = "";
  for (let i = 0; i < l; i++) {
    tittums += top[i];
    exploded += revtop[i];
    if (i < bottom.length) {
      tittums += bottom[i];
      exploded += bottom[i];
    }
  }
  return {Tittums: tittums, "Exploded Tittums": exploded};
}



//pattern has the form of a row where some characters are specific bells and others are "X";
function getrowsfrompattern(pattern) {
  let rows = [];
  //holder for bells represented by x
  let v = [];
  let rounds = places.slice(0, pattern.length);
  for (let i = 0; i < rounds.length; i++) {
    if (!pattern.includes(rounds[i])) {
      v.push(bellnum(rounds[i]));
    }
  }
  if (v.length) {
    let extent = buildextent(v);
    for (let i = 0; i < extent.length; i++) {
      let row = [];
      let sub = extent[i];
      let k = 0;
      for (let j = 0; j < pattern.length; j++) {
        let c = pattern[j];
        if (c === "X") {
          row.push(sub[k]);
          k++;
        } else {
          row.push(bellnum(c));
        }
      }
      rows.push(row);
    }
  } else {
    rows.push(pattern.split("").map(bellnum));
  }
  return rows;
}

//take a pattern shorter than the given stage and produce all the versions with "X" (capital because of bell letters also being capitals)
function patternstage(pattern, stage) {
  let n = pattern.length;
  let res = [];
  for (let i = 0; i <= stage-n; i++) {
    let p = "";
    for (let j = 0; j < stage; j++) {
      if (j < i || j >= i+n) {
        p += "X";
      } else if (j === i) {
        p += pattern;
      }
    }
    res.push(p);
  }
  return res;
}

//take a pattern with parentheses and return an array of patterns with no parentheses
//no nested parentheses allowed
function handlepatterns(pattern) {
  let chars = 0;
  let openparens = [];
  let closeparens = [];
  let inside;
  let xinside;
  //collect indexes of parentheses
  for (let i = 0; i < pattern.length; i++) {
    let c = pattern[i];
    switch (c) {
      case "(":
        inside = true;
        openparens.push(i);
        break;
      case ")":
        inside = false;
        closeparens.push(i);
        break;
      default:
        if (inside && c === "x") xinside = true;
        chars++;
    }
  }
  if (openparens.length != closeparens.length || !closeparens.every((n,i) => n > openparens[i]) || chars > stage || xinside) {
    return [];
  } else {
    let current = [pattern];
    let next = [];
    for (let i = openparens.length-1; i > -1; i--) {
      for (let j = 0; j < current.length; j++) {
        let pp = expandgroup(current[j], openparens[i], closeparens[i]);
        next.push(...pp);
      }
      current = next;
      next = [];
    }
    return current;
  }
}

//take a pattern with a group in parentheses and build an extent of that group
//pattern is a string
//start and end are indices of parentheses
function expandgroup(pattern, start, end) {
  let patterns = [];
  let chunk = [];
  for (let j = start+1; j < end; j++) {
    chunk.push(bellnum(pattern[j]));
  }
  let ext = buildextent(chunk);
  ext.forEach(a => {
    let p = pattern.slice(0,start) + rowstring(a) + pattern.slice(end+1);
    patterns.push(p);
  });
  return patterns;
}

//given row r, build all the permutations
function buildextent(r) {
  let n = r.length;
  let arr = [];
  if (n === 2) {
    return extenttwo(r);
  } else if (n < 13) {
    for (let i = 0; i < n; i++) {
      let others = []; //as in "not i"
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
  let arr = [r, [r[1], r[0]]];
  return arr;
}



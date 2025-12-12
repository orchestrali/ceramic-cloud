const places = "1234567890ETABCD";
const stagenames = ["Doubles","Minor","Triples","Major","Caters","Royal", "Cinques","Maximus","Sextuples","Fourteen","Septuples","Sixteen"];
const tableheads = ["Mask", "Description", "Category", "Type", "Stroke", "Possible", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"];
var schemerules = [];
var categorynames = [];
var categorystats = [];






$(function() {
  buildinitialtables();
  buildinitialrules();

  $("#downloadcsv").on("click", downloadfile);
  $("#addpattern").on("click", addschemerule);
});







function stageclick(e) {
  $(e.currentTarget).next().toggle();
}

function removerowclick(e) {
  $(e.currentTarget).parent("tr").remove();
}

function addschemerule() {
  let stage = Number($("#stage option:checked").val());
  let rounds = places.slice(0, stage);
  let chars = rounds + "x()";
  let pattern = $("#patternentry").val();
  let parr = pattern.split("");
  if (parr.some(c => !chars.includes(c))) {
    //invalid pattern
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



function buildcsv() {
  //probably rebuild summaries first??
  categorysummarize();
  
  let header = ["Id", "SchemeId", "Stage", "Sequence", "Mask", "Description", "Summarise", "Type", "Stroke", "Possible", "Minimum", "Maximum", "Factor", "Score", "ScoreFront", "ScoreInternal", "ScoreBack"].join(",");
  
  let texts = {
    odd: `
`,
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
        let row = [ids[idkey], "", stage, i+1, lstring, o.name, "0", "Subtotal", "Any", "0","0","0","0","0","0","0","0"];
        texts[idkey] += row.join(",") + `
`;
        ids[idkey]++;
      });
    }
    
    let rows = gettablerows(stage);
    rows.forEach((r,i) => {
      let row = [ids[idkey], "", stage, r.seq, r.Mask, r.Description, "0", r.Type, r.Stroke, r.Possible, "0", "", "1", r.Score, r.ScoreFront, r.ScoreInternal, r.ScoreBack];
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


function buildinitialrules() {
  let strs = ["1234","4321"];
  //not using this but keeping as model??
  let runs = [{pattern: "1234", locations: "fb", points: 1, category: "4-bell runs", transpose: true},
             {pattern: "4321", locations: "fb", points: 1, category: "4-bell runs", transpose: true}];
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
        category: p.length+"-bell runs",
        transpose: true
      };
      set.rules.push(o);
    });
    let rounds = places.slice(0,s);
    let backrounds = rounds.split("").reverse().join("");
    set.rules.push({pattern: rounds, locations: "fmb", points: 1, description: rounds+" (Rounds)", category: "Named rows"});
    set.rules.push({pattern: backrounds, locations: "fmb", points: 1, description: backrounds+" (Backrounds)", category: "Named rows"});
    
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
        description: queensy[name] + " ("+name+")",
        category: "Named rows"
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
    </div>`;
    $("#schemetables").append(html);
  }
  let table = `<table class="sortable">
        <thead>
          <th>${tableheads.join("</th><th>")}</th>
        </thead>
        <tbody>
        </tbody>
      </table>`;
  $(".stagescheme").append(table);
  $(".stagescheme p").on("click", stageclick);
  $("table").on("click", ".remove", removerowclick);
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
    //need to add this!!
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

//r is a "rule"
function buildtablerow(r, stage, num) {
  let p = r.pattern;
  let cols = [p];
  if (r.description) {
    cols.push(r.description);
  } else {
    cols.push(p+"s");
  }
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

function factorial(n) {
  for (let i = n-1; i > 1; i--) {
    n *= i;
  }
  return n;
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
        if (inside && c === "X") xinside = true;
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



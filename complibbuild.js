const places = "1234567890ETABCD";

var schemerules = [];






$(function() {
  buildinitialrules();
});







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



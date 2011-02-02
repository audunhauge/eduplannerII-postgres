module.exports.lev =  function(s,t) {
    // ith character of s
    var si; 
    // cost
    var c;
    // Step 1
    var n = s.length;
    var m = t.length;
    if (!n)
      return m;
    if (!m)
      return n;
    // Matrix
    var mx = [];
    // Step 2 - Init matrix
    for (var i=0; i<=n; i++) {
      mx[i] = [];
      mx[i][0] = i;
    }
    for (var j=0; j<=m; j++)
      mx[0][j] = j;
    // Step 3 - For each character in s
    for (var i=1; i<=n; i++) {
      si = s.charAt(i - 1);
      // Step 4 - For each character in t do step 5 (si == t.charAt(j - 1) ? 0 : 1) and 6
      for (var j=1; j<=m; j++)
        mx[i][j] = Math.min(mx[i - 1][j] + 1, mx[i][j - 1] + 1, mx[i - 1][j - 1] + (si == t.charAt(j - 1) ? 0 : 1));
    }
    // Step 7
    return mx[n][m];
  };

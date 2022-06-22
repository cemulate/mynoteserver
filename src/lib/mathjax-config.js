window.MathJax = {
  tex: {
    macros: {
      im: "\\operatorname\{im\}",
      Aut: "\\operatorname\{Aut\}",
      Gal: "\\operatorname\{Gal\}",
      val: "\\operatorname\{val\}",
      vspan: "\\operatorname\{span\}",
      co: "\\operatorname\{co\}",
      sgn: "\\operatorname\{sgn\}",
      Syz: "\\operatorname\{Syz\}",
      codim: "\\operatorname\{codim\}",
      lcm: "\\operatorname\{lcm\}",
      Rad: "\\operatorname\{Rad\}",
      Tr: "\\operatorname\{Tr\}",
      tr: "\\operatorname\{tr\}",
      ad: "\\operatorname\{ad\}",
      Ad: "\\operatorname\{Ad\}",
      id: "\\operatorname\{id\}",
      diag: "\\operatorname\{diag\}",
      del: "\\operatorname\{del\}",
      lk: "\\operatorname\{lk\}",
      supp: "\\operatorname\{supp\}",
      Hom: "\\operatorname\{Hom\}",
      Ext: "\\operatorname\{Ext\}",
      Tor: "\\operatorname\{Tor\}",
      Sym: "\\operatorname\{Sym\}",
      leadt: "\\operatorname\{LT\}",
      dash: "\\operatorname\{x2013\}",
      colim: "\\operatorname\{colim\}",
      Lan: "\\operatorname\{Lan\}",
      cc: "\\mathbb{C}",
      rr: "\\mathbb{R}",
      qq: "\\mathbb{Q}",
      zz: "\\mathbb{Z}",
      nat: "\\mathbb{N}",
      ff: "\\mathbb{F}",
      true: "\\textnormal{true}",
      bb: ["\\mathbf{#1}", 1],
      ii: ["\\mathit{#1}", 1],

      tor: "\\text{ or }",
      tand: "\\text{ and }",
      tnot: "\\text{ not }",
      tst: "\\text{ such that }",
      tiff: "\\text{ if and only if }",
      la: "\\langle",
      ra: "\\rangle",

      tvec: ["\\left( \\begin{array}{c} #1 \\\\ #2 \\end{array} \\right)", 2],
      tmat: ["\\left( \\begin{array}{cc} #1 & #2 \\\\ #3 & #4 \\end{array} \\right)", 4],
      svec: ["\\left( \\begin{smallmatrix} #1 \\\\ #2 \\end{smallmatrix} \\right)", 2],
      smat: ["\\left( \\begin{smallmatrix} #1 & #2 \\\\ #3 & #4 \\end{smallmatrix} \\right)", 4],

      setbuilder: ["\\left\\{#1 : #2\\right\\}", 2],

      set: ["\\left\\{ #1 \\right\\}", 1],

      tprob: ["Pr(\\text{#1})", 1],
      tjointp: ["Pr(\\text{#1}, \\; \\text{#2})", 2],
      tcondp: ["Pr(\\text{#1} \\; \\vert \\; \\text{#2})", 2],
      jointp: ["Pr(#1, #2)", 2],
      condp: ["Pr(#1 \\; \\vert \\; #2)", 2],
      cond: ["#1 \\; \\vert \\; #2", 2],

      deriv: ["\\dfrac{\\text{d}}{\\text{d}#1}", 1],
      derivs: ["\\dfrac{\\text{d}#1}{\\text{d}#2}", 2],
      hderiv: ["\\dfrac{\\text{d}^{#1}}{\\text{d} {#2}^{#1}}", 2],
      hderivs: ["\\dfrac{\\text{d}^{#1} {#2}}{\\text{d} {#3}^{#1}}", 3],

      pderiv: ["\\dfrac{\\partial }{\\partial #1}", 1],
      pderivs: ["\\dfrac{\\partial #1}{\\partial #2}", 2],
      phderiv: ["\\dfrac{\\partial^{#1}}{\\partial {#2}^{#1}}", 2],
      phderivs: ["\\dfrac{\\partial^{#1} {#2}}{\\partial {#3}^{#1}}", 3],
      mpderivs: ["\\dfrac{\\partial^{#1} {#2}}{\\partial {#3} \\partial {#4}}", 4],

      abs: ["\\lvert #1 \\rvert", 1],
      norm: ["\\lVert #1 \\rVert", 1],

      inflim: ["\\lim\\limits_{#1 \\rightarrow \\infty}", 1],
      inflimsup: ["\\limsup\\limits_{#1 \\rightarrow \\infty}", 1],
      infliminf: ["\\liminf\\limits_{#1 \\rightarrow \\infty}", 1],
      infsum: ["\\sum\\limits_{#1 = #2}^{#3}", 3],
      flim: ["\\lim\\limits_{#1 \\rightarrow #2}", 2],

      what: ["\\widehat{#1}", 1],
      wtil: ["\\widetilde{#1}", 1],
      wt: ["\\widetilde{#1}", 1],

      interior: ["\\text{int}(#1)", 1],

      mjqed: "\\tag*{$\\Box$}",

      presheaves: ["[#1^{\\text{op}}, \\mathbf{Set}]", 1],

      downset: ["\\mathord{\\downarrow}#1", 1],

      modcat: ["#1\\text{-}\\textbf{Mod}", 1],

      intord: "\\mathord{\\int}"
    }
  }
};

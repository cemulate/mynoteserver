window.MathJax = {
    tex: {
        macros: {},
    },
};

window.mynoteserver = {
    userSnippets: {
        "LR paren": {
            "prefix": "@(",
            "body": ["\\left( $1 \\right)$0"]
        },
        "LR bracket": {
            "prefix": "@[",
            "body": ["\\left[ $1 \\right]$0"]
        },
        "LR brace": {
            "prefix": "@{",
            "body": ["\\left\\{ $1 \\right\\}$0"]
        },
        "Infinity": {
            "prefix": "@8",
            "body": ["\\infty$0"]
        },
        "Display Math": {
            "prefix": "@disp",
            "body": ["$$", "$0", "$$"]
        }
    },
    perfectFreehandOptions: {
        size: 4,
        thinning: 0.8,
        // Will be overridden to false when using a stylus/pen, so this is
        // relevant to touch/mouse input.
        simulatePressure: false,
    },
};

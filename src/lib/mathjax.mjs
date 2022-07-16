import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { CHTML } from 'mathjax-full/js/output/chtml.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AssistiveMmlHandler } from 'mathjax-full/js/a11y/assistive-mml.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

class MathRenderer {
    constructor(mathjaxConfig) {
        this.documentOptions = {
            InputJax: new TeX({ packages: AllPackages, ...mathjaxConfig?.tex }),
            OutputJax: new CHTML({ fontURL: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/output/chtml/fonts/woff-v2', ...mathjaxConfig?.chtml }),
        }

        this.adaptor = liteAdaptor();
        this.handler = RegisterHTMLHandler(this.adaptor);
        this.doc = mathjax.document('', this.documentOptions);
    }

    render(content, display = false) {
        let node = this.doc.convert(content, { display });
        return this.adaptor.outerHTML(node);
    }

    getStyleSheet() {
        return this.adaptor.textContent(this.documentOptions.OutputJax.styleSheet(this.doc));
    }
}

export { MathRenderer };

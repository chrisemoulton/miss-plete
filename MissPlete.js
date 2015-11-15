import levenshtein from './levenshtein.js';
import memoize from './memoize.js';

class MissPlete {

  constructor({
    input,
    options,
    scoreFn = memoize(MissPlete.scoreFn),
    listItemFn = MissPlete.listItemFn
  }) {
    Object.assign(this, { input, options, scoreFn, listItemFn });

    this.scoredOptions = null;
    this.container = null;
    this.ul = null;
    this.highlightedIndex = -1;

    this.input.addEventListener('input', () => {
      if (this.input.value.length > 0) {
        // const normalizedInput = this.input.value.trim().toLowerCase();
        this.scoredOptions = this.options
          //.map(option => scoreFn(normalizedInput, option))
          .map(option => scoreFn(this.input.value, option))
          .sort((a, b) => b.score - a.score);
      } else {
        this.scoredOptions = [];
      }
      this.renderOptions();
    });

    this.input.addEventListener('keydown', event => {
      if (this.ul) {  // dropdown visible?
        switch (event.keyCode) {
          case 13:
            this.select();
            break;
          case 27:  // Esc
            this.removeDropdown();
            break;
          case 40:  // Down arrow
            // Otherwise up arrow places the cursor at the beginning of the
            // field, and down arrow at the end
            event.preventDefault();
            this.changeHighlightedOption(
              this.highlightedIndex < this.ul.children.length - 1
              ? this.highlightedIndex + 1
              : -1
            );
            break;
          case 38:  // Up arrow
            event.preventDefault();
            this.changeHighlightedOption(
              this.highlightedIndex > -1
              ? this.highlightedIndex - 1
              : this.ul.children.length - 1
            );
            break;
        }
      }
    });

    this.input.addEventListener('blur', (event) => {
      this.removeDropdown();
      this.highlightedIndex = -1;
    });
  }  // end constructor

  static scoreFn(inputValue, optionSynonyms) {
    let closestSynonym = null;
    for (let synonym of optionSynonyms) {
      let d = levenshtein(
        synonym.trim().toLowerCase(),
        inputValue.trim().toLowerCase()
      );
      if (closestSynonym === null || d < closestSynonym.distance) {
        closestSynonym = { value: synonym, distance: d };
        if (d === 0) { break; }
      }
    }
    return {
      score: -closestSynonym.distance,
      displayValue: optionSynonyms[0],
    };
  }

  // For now (in ECMAScript 2015), classes only let you create static methods, but
  // not static data properties. There are two work-arounds for that.
  // http://exploringjs.com/es6/ch_classes.html#leanpub-auto-static-data-properties
  //
  // getter
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get
  //
  // NOTE: Constants can be declared with uppercase or lowercase, but a common
  // convention is to use all-uppercase letters.
  // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Statements/const
  static get MAX_ITEMS() {
    return 8;
  }

  static listItemFn(scoredOption, itemIndex) {
    const li = itemIndex > MissPlete.MAX_ITEMS
      ? null
      : document.createElement("li");
    li && li.appendChild(document.createTextNode(scoredOption.displayValue));
    return li;
  }  

  getSiblingIndex(node) {
    let index = -1;
    let n = node;
    do {
      index++;
      n = n.previousElementSibling;
    } while (n);
    return index;
  }

  renderOptions() {  
    const documentFragment = document.createDocumentFragment();

    this.scoredOptions.every((scoredOption, i) => {
      const listItem = this.listItemFn(scoredOption, i);
      listItem && documentFragment.appendChild(listItem);
      return !!listItem;
    });

    this.removeDropdown();
    this.highlightedIndex = -1;

    if (documentFragment.hasChildNodes()) {
      const newUl = document.createElement("ul");
      newUl.addEventListener('mouseover', event => {
        if (event.target.tagName === 'LI') {
          this.changeHighlightedOption(this.getSiblingIndex(event.target));
        }
      });

      newUl.addEventListener('mouseleave', () => {
        this.changeHighlightedOption(-1);
      });

      newUl.addEventListener('mousedown', event => event.preventDefault());

      newUl.addEventListener('click', event => {
        if (event.target.tagName === 'LI') {
          this.select();
        }
      });

      newUl.appendChild(documentFragment);

      // See CSS to understand why the <ul> has to be wrapped in a <div>
      const newContainer = document.createElement("div");
      newContainer.className = 'miss-plete';
      newContainer.appendChild(newUl);

      // Inserts the dropdown just after the <input> element
      this.input.parentNode.insertBefore(newContainer, this.input.nextSibling);
      this.container = newContainer;
      this.ul = newUl;
    }
  }

  changeHighlightedOption(newHighlightedIndex) {
    if (newHighlightedIndex >= -1 &&
        newHighlightedIndex < this.ul.children.length)
    {
      // If any option already selected, then unselect it
      if (this.highlightedIndex !== -1) {
        this.ul.children[this.highlightedIndex].classList.remove("highlight");
      }

      this.highlightedIndex = newHighlightedIndex;

      if (this.highlightedIndex !== -1) {
        this.ul.children[this.highlightedIndex].classList.add("highlight");
      }
    }
  }

  select() {
    if (this.highlightedIndex !== -1) {
      this.input.value = this.scoredOptions[this.highlightedIndex].displayValue;
      this.removeDropdown();
    }
  }

  removeDropdown() {
    // this.ul && this.ul.remove();
    // this.ul = null;
    this.container && this.container.remove();
    this.container = null;
    this.ul = null;
  }

}


export default MissPlete;
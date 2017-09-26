# `<process-image>`

This repository is the result of an exploration of transforming the React component to process images into a webcomponent.
All credits for the original idea, API and implementation go to https://github.com/nitin42/react-imgpro

A running example can be found at https://timvdlippe.github.io/react-imgpro/
A full diff can be seen [here](https://github.com/nitin42/react-imgpro/compare/master...TimvdLippe:master)

## Why?

When I took a first look at the original React implementation, I wondered what React was offering that would be fundamental to writing this component.
As I am mostly experienced with webcomponents, a mapping from the React version to a native webcomponent seemed doable.
Secondly, as I have no experience with React, I wanted to know what the overlap in functionality was and how they can be transformed from one to another.

## Notes

In the process of transformation I wrote down some notes:

* React was not required to write the component.
Factoring out React was kind of straight-forward, even though I had no experience at all with the React codebase nor its component model.
The webcomponent can now work with any framework (or none at all).
  * The React component used `props` to thread down its current state to the various functions.
It used a [`propsFactory`](https://github.com/nitin42/react-imgpro/blob/7e3ec9c89016acf042f681d04e4bd4dd4b423f9d/src/utils/propsFactory.js) to filter out the image settings.
I think this is an artifact of writing components the functional way, where `props` are always passed down and a function decides what it used.
In the webcomponent, I chose to split these out into different properties.
E.g. `settings` is a separate property.
  * React implements its own lifecycle callback, for which `react-imgpro` implemented `componentWillMount`, `componentDidMount` and `componentWillUnmount`.
The native equivalent callbacks are `connectedCallback` and `disconnectedCallback`.
I was unable to find a difference between `componentWillMount` and `componentDidMount` in a webcomponent point of view, as it seemed that `componentWillMount` is meant for server side rendering (per [StackOverflow](https://stackoverflow.com/questions/29899116/what-is-the-difference-between-componentwillmount-and-componentdidmount-in-react))
  * The original implementation used a React component called [`react-progressive-image`](https://github.com/FormidableLabs/react-progressive-image).
This seemed to be an image which transforms from a placeholder nicely into the actual image later.
An equivalent webcomponent I found not tied to React was [`iron-image`](https://www.webcomponents.org/element/PolymerElements/iron-image/elements/iron-image).
It seemed to have the same functionality.
  * The original implementation also used [`browser-image-size`](https://github.com/cesarandreu/browser-image-size) which (per [the implementation](https://github.com/cesarandreu/browser-image-size/blob/b392c77f63ef292a5aed571b48c31ff3373ab96f/lib/index.js)) was used to retrieve the actual image height.
For this, as we are in a browser context already, I used [`this.getBoundingClientRect()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) which returned the same value.
**Note:** I did find a CSS issue where 4 pixels were added to the bottom of my component.
I was not able to find out why this was happening; would still like to fix that.
  * Lastly, the original implementation relied on [`webworkify-webpack`](https://github.com/borisirota/webworkify-webpack), which is not required in a browser context, as we have a WebWorker natively available.
* Instead of returning JSX to render the element, the webcomponent uses shadowdom and manually updates values of `this.imageElement`.
This means that it does not require a VDOM implementation, as the webcomponent only updates those DOM values that it needs to.
* Updating properties and attributes was tricky.
As the webcomponent specification explicitly is low level, a lot of opinionated choices are left up to the developer.
As such, there is no standard way of handling properties and attributes.
I manually implemented those getters and setters required to make the component work.
This had two effects:
  1. It means that updating effects will only trigger those effects that have to trigger, but no unrelated.
  2. It took me some trial and error to correctly handle all cases, and it might still be the case that I forgot some.
  For future webcomponents, I would write a small abstraction layer that takes care of this in a generic manner, to prevent any developer mistakes.
  The abstraction layer should of course remain ultrathin, to not impose any performance degredations.

## Conclusion

Rewriting this React component to a webcomponent was surprisingly straightforward, even though I had no experience with React at all.
The moment it just worked in the browser, combined with the natively available ES modules were a nice dev experience in my opinion.
Handling the properties and attributes took me more time than I expected and I would like to write a thin abstraction layer for just that.

Other than that, the conversion of this particular React component seems succesful and could be replaced almost one-on-one with the native webcomponent.

(I tested this component in all browsers. It only did not work in IE11 as it is written in ES6.
In a consumer application, a transpilation step usually already exists, so I left transpilation up to the user. 
This is a personal and opionated decision)
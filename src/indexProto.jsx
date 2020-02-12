import React                 from 'react';
import ReactDOM              from 'react-dom';
import { Provider, connect } from 'react-redux';
import { createStore }       from 'redux';
import * as R                from 'ramda';

const EMPTY = '';

const ACTION = {
  ADDITEM        : 'addItem',
  TOGGLEITEM     : 'toggleItem',
  CLEARINPUTFORM : 'clearInputForm',
  HANDLEINPUTFORM: 'readInputForm',
  TOGGLEFILTER   : 'toggleFilter'
};

const FILTER = {
    ALL: 'all',
    COMPLETE: 'complete',
    TODO: 'todo'
};


/*
 * Actions
 */

const addItem        = (subject) => ({type: ACTION.ADDITEM,         payload: subject});
const toggleItem     = (index)   => ({type: ACTION.TOGGLEITEM,      payload: index});
const clearCompleted = ()        => ({type: ACTION.CLEARCOMPLETED,  payload: EMPTY});
const clearInputForm = ()        => ({type: ACTION.CLEARINPUTFORM,  payload: EMPTY});
const readInputForm  = (text)    => ({type: ACTION.HANDLEINPUTFORM, payload: text});
const toggleFilter   = (text)    => ({type: ACTION.TOGGLEFILTER,    payload: text});

/*
 * Initial State
 */

// Generate a ref for focusing
const useFocus = () => {
    const htmlElRef = React.useRef(null);
    const setFocus = () => {htmlElRef.current && htmlElRef.current.focus();};

    return {inputRef: htmlElRef, setInputFocus: setFocus};
};

const initialState = {
  todos: [
    { subject: 'Learn React', id: 0, complete: false},
    { subject: 'Learn Redux', id: 1, complete: true},
    { subject: 'Learn Scala', id: 2, complete: false}
  ],
  filter: FILTER.ALL,
  input: ''
};

/*
 * Reducers/Store
 */


const todos_    = R.lensProp('todos');
const subject_  = R.lensProp('subject');
const id_       = R.lensProp('id');
const complete_ = R.lensProp('complete');
const input_    = R.lensProp('input');
const filter_   = R.lensProp('filter');

const makeReducer = (lens, transform) => (state, action) => R.over(lens, transform(action.payload), state);

const todoReducers = {
  addItem       : makeReducer(todos_, payload => todos => R.isEmpty(payload) ?
                              todos : R.append({subject: payload, complete:false, id: todos.length}, todos)),
  clearCompleted: makeReducer(todos_, () => R.reject(R.view(complete_))),
  toggleItem    : makeReducer(todos_, payload => R.adjust(payload, R.over(complete_, R.not))),
  readInputForm : makeReducer(input_, payload => R.always(payload)),
  clearInputForm: makeReducer(input_, payload => R.always(payload)),
  toggleFilter  : makeReducer(filter_, payload => R.always(payload))
};

const mainReducer = (state, action) =>
  R.defaultTo(R.identity, todoReducers[action.type])(state || initialState, action);

const store = createStore(
    mainReducer,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

/*
 * React Components
 */

const Header = () => <h1>Todo List</h1>;
const List   = () => (items) => <ul>{items}</ul>;
const Div    = (components) => React.createElement('div', {}, ...components);

const Option = (value) => <option key={value} value={value}>{value}</option>;
const Options = R.map(Option, R.values(FILTER));

const Select = ({doToggleFilter}) => <select onChange={doToggleFilter}>{Options}</select>;
const Label  = (label) => (cmpnt) => <label>{label}{cmpnt}</label>;

const Filter = R.compose(Label('Filter:'), Select);

const Item = ({doToggleItem, filter}) => ({subject, id, complete}) => {
    const showAll = filter === FILTER.ALL;
    const completeFilter = filter === FILTER.COMPLETE && complete;
    const todoFilter = filter === FILTER.TODO && !complete;
    const itemMatchesFilter = completeFilter || todoFilter;
    if (showAll || itemMatchesFilter) {
        return (<li key={id}
                    onClick={_ => doToggleItem(id)}
                    style={{textDecoration: complete ? 'line-through' : 'none'}}
                >
                  {subject}
                </li>);
    }
    return null;
};

const getTodos = () => R.prop('todos');

const TodoList = (context) =>
      R.compose(...R.ap([List, R.compose(R.map, Item), getTodos], [context]))(context);

const TodoForm = ({doClearCompleted, doHandleInputForm, doAddItem, input}) => {
  const {inputRef, setInputFocus} = useFocus(); // Impure
  return <form onSubmit={e => (e.preventDefault(), doAddItem(input))}>
           <input autoFocus onChange={doHandleInputForm}
                  value={input}
                  ref={inputRef}/>
           <button type="input" onClick={setInputFocus}>add</button>
         </form>;
};

const pure = (a) => [a];
const TodoContainer = R.compose(Div, R.ap([Header, Filter, TodoList, TodoForm]), pure);
/*
 * Redux Plumbing
 */

const viewTarget = R.view(R.lensPath(['target', 'value']));

const ConnectedTodoContainer = connect(
  R.identity,
  dispatch => ({
    doAddItem        : R.compose(v => (dispatch(addItem(v)), dispatch(clearInputForm(''))), R.trim),
    doToggleItem     : R.compose(dispatch, toggleItem),
    doHandleInputForm: R.compose(dispatch, readInputForm, viewTarget),
    doClearCompleted : R.compose(dispatch, clearCompleted),
    doToggleFilter   : R.compose(dispatch, toggleFilter, viewTarget)
  })
)(TodoContainer);

/*
 * Main
 */

const Main = () =>
 <Provider store={store}>
   <ConnectedTodoContainer />
 </Provider>;

ReactDOM.render(<Main />, document.querySelector('#container'));

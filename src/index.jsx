import React                 from 'react';
import ReactDOM              from 'react-dom';
import { Provider, connect } from 'react-redux';
import { createStore }       from 'redux';
import * as R                from 'ramda';

// {ActionType}
const ACTION = {
    READINPUT: 'readInput',
    ADDITEM: 'addItem',
    CLEARINPUT: 'clearInput',
    TOGGLEITEM: 'toggleItem',
    CLEARCOMPLETED: 'clearCompleted'
};

const EMPTY = '';

// String -> Action
const readInput = (text) => ({type: ACTION.READINPUT, payload: text});

// String -> Action
const addItem = (text) => ({type: ACTION.ADDITEM, payload: {subject: text, completed: false}});

// Int -> Action
const toggleItem = (id) => ({type: ACTION.TOGGLEITEM, payload: id});

// () -> Action
const clearInput = () => ({type: ACTION.CLEARINPUT});

// () -> Action
const clearCompleted = () => ({type: ACTION.CLEARCOMPLETED});

// Lens s Input
const input_ = R.lensProp('input');

// Lens s Todos
const todos_ = R.lensProp('todos');

// Lens s Bool
const completed_ = R.lensProp('completed');

// State
const initialState = {
    todos: [],
    input: ''
};

// {ActionType -> (State, Action) -> State}
const reducers = {
    readInput: (state, {payload}) => R.set(input_, payload, state),
    addItem: (state, {payload}) =>
        R.isEmpty(payload.subject)
        ? state
        : R.over(todos_, R.append(payload), state),
    toggleItem: (state, {payload}) => R.over(todos_, R.adjust(payload, R.over(completed_, R.not)), state),
    clearInput: (state, _) => R.set(input_, EMPTY, state),
    clearCompleted: (state, _) => R.over(todos_, R.reject(R.view(completed_)), state)
};

// (State, Action) -> State
const mainReducer = (state, action) =>
      R.defaultTo(R.identity, reducers[action.type])(state || initialState, action);

// ((State, Action) -> State) -> Store
const store = createStore(
    mainReducer,
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
);

// Generate a ref for focusing
const genFocus = () => {
    const htmlElRef = React.useRef(null);
    return {inputRef: htmlElRef};
};

// Props -> ReactComponent
const InputForm = ({doGenFocus, doHandleInputForm, doClearCompleted, doAddItem, input}) => {
    const {inputRef} = doGenFocus();
    return <form onSubmit={e => (e.preventDefault(), doAddItem(input))}>
             <input autoFocus onChange={doHandleInputForm} value={input} ref={inputRef}/>
             <button type="button" onClick={doClearCompleted}>clear completed</button>
           </form>;
};

// Context -> Props -> ReactComponent
const Item = ({doToggleItem}) => ({subject, completed, id}) =>
      <li key={id}
          style={{textDecoration: completed ? 'line-through' : 'none'}}
          onClick={_ => doToggleItem(id)}
      >
        {subject}
      </li>;

// Props -> ReactComponent
const TodoList = ({doToggleItem, todos}) => <ul>{R.map(Item({doToggleItem}), todos)}</ul>;

// Props -> ReactComponent
const TodoWidget = (props) =>
      <div>
        <InputForm {...props} />
        <TodoList {...props} />
      </div>;

// [{...a}] -> [{...a, id: Int}]
const addIds = (todos) => todos.map((el, id) => ({...el, id}));

// Event -> Value
const viewTarget = R.view(R.lensPath(['target', 'value']));

// Redux Connected Component
const ConnectedTodoWidget = connect(
    state => ({doGenFocus: genFocus,
               ...R.over(todos_, addIds, state)}),
    dispatch => ({
        doHandleInputForm: R.compose(dispatch, readInput, viewTarget),
        doAddItem: (v) => (dispatch(addItem(R.trim(v))), dispatch(clearInput())),
        doToggleItem: R.compose(dispatch, toggleItem),
        doClearCompleted: R.compose(dispatch, clearCompleted)
    }))(TodoWidget);

const Main = () =>
      <Provider store={store}>
        <ConnectedTodoWidget />
      </Provider>;

ReactDOM.render(<Main />, document.querySelector('#container'));

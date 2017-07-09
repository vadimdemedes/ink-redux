import {h, render, renderToString, mount, Component} from 'ink';
import {createStore, combineReducers} from 'redux';
import stripAnsi from 'strip-ansi';
import {spy} from 'sinon';
import test from 'ava';
import {Provider, connect} from '.';

const counterReducer = (state = 0, action) => {
	switch (action.type) {
		case 'INCREMENT': return state + 1;
		default: return state;
	}
};

const reducer = combineReducers({
	counter: counterReducer
});

const createTestStore = () => createStore(reducer);

test('provider', t => {
	t.plan(1);

	const store = {};

	const Child = (props, context) => {
		t.is(context.store, store);

		return 'Test';
	};

	render((
		<Provider store={store}>
			<Child/>
		</Provider>
	));
});

test('pass props to child component', t => {
	const store = createTestStore();

	const Child = props => `Hello, ${props.name}`;
	const ConnectedChild = connect()(Child);

	const tree = render((
		<Provider store={store}>
			<ConnectedChild name="Chandler"/>
		</Provider>
	));

	t.is(renderToString(tree), 'Hello, Chandler');
});

test.cb('subscribe to store and rerender on changes', t => {
	const store = createTestStore();

	const Child = props => `Iteration #${props.iteration}`;

	const mapStateToProps = state => ({
		iteration: state.counter
	});

	const ConnectedChild = connect(mapStateToProps)(Child);

	const stream = {write: spy()};
	const unmount = mount((
		<Provider store={store}>
			<ConnectedChild/>
		</Provider>
	), stream);

	t.is(stripAnsi(stream.write.firstCall.args[0]), 'Iteration #0\n');

	store.dispatch({type: 'INCREMENT'});

	process.nextTick(() => {
		unmount();

		t.is(stripAnsi(stream.write.secondCall.args[0]), 'Iteration #1\n');
		t.end();
	});
});

test('pass store.dispatch() to child component', t => {
	const store = createTestStore();

	class Child extends Component {
		render() {
			return 'Test';
		}

		componentDidMount() {
			this.props.dispatch({type: 'INCREMENT'});
		}
	}

	const ConnectedChild = connect()(Child);

	render((
		<Provider store={store}>
			<ConnectedChild/>
		</Provider>
	));

	t.deepEqual(store.getState(), {counter: 1});
});

test('bind dispatch props', t => {
	const store = createTestStore();

	class Child extends Component {
		render() {
			return 'Test';
		}

		componentDidMount() {
			this.props.onIncrement();
		}
	}

	const mapDispatchToProps = {
		onIncrement: () => ({type: 'INCREMENT'})
	};

	const ConnectedChild = connect(null, mapDispatchToProps)(Child);

	render((
		<Provider store={store}>
			<ConnectedChild/>
		</Provider>
	));

	t.deepEqual(store.getState(), {counter: 1});
});

test('pass custom dispatch props', t => {
	const store = createTestStore();
	spy(store, 'dispatch');

	class Child extends Component {
		render() {
			return 'Test';
		}

		componentDidMount() {
			this.props.onIncrement();
		}
	}

	const mapDispatchToProps = (dispatch, ownProps) => {
		return {
			onIncrement: () => {
				dispatch({
					type: 'INCREMENT',
					message: ownProps.message
				});
			}
		};
	};

	const ConnectedChild = connect(null, mapDispatchToProps)(Child);

	render((
		<Provider store={store}>
			<ConnectedChild message="Hello"/>
		</Provider>
	));

	t.deepEqual(store.getState(), {counter: 1});
	t.deepEqual(store.dispatch.firstCall.args[0], {
		type: 'INCREMENT',
		message: 'Hello'
	});
});

test('overwrite own props', t => {
	const store = createTestStore();

	class Child extends Component {
		render(props) {
			return `Iteration #${props.counter}`;
		}

		componentDidMount() {
			this.props.onIncrement();
		}
	}

	const mapStateToProps = state => ({
		counter: state.counter
	});

	const mapDispatchToProps = {
		onIncrement: () => ({type: 'INCREMENT'})
	};

	const ConnectedChild = connect(mapStateToProps, mapDispatchToProps)(Child);

	const fakeOnIncrement = spy();

	const tree = render((
		<Provider store={store}>
			<ConnectedChild counter={10} onIncrement={fakeOnIncrement}/>
		</Provider>
	));

	t.is(renderToString(tree), 'Iteration #0');
	t.false(fakeOnIncrement.called);
	t.deepEqual(store.getState(), {counter: 1});
});

test('custom merge function', t => {
	const store = createTestStore();

	class Child extends Component {
		render(props) {
			return `Iteration #${props.counter}`;
		}

		componentDidMount() {
			this.props.onIncrement();
		}
	}

	const mapStateToProps = state => ({
		counter: state.counter
	});

	const mapDispatchToProps = {
		onIncrement: () => ({type: 'INCREMENT'})
	};

	const mergeProps = (stateProps, dispatchProps, ownProps) => {
		return Object.assign({}, stateProps, dispatchProps, ownProps);
	};

	const ConnectedChild = connect(mapStateToProps, mapDispatchToProps, mergeProps)(Child);

	const fakeOnIncrement = spy();

	const tree = render((
		<Provider store={store}>
			<ConnectedChild counter={10} onIncrement={fakeOnIncrement}/>
		</Provider>
	));

	t.is(renderToString(tree), 'Iteration #10');
	t.true(fakeOnIncrement.calledOnce);
	t.deepEqual(store.getState(), {counter: 0});
});

'use strict';

const {bindActionCreators} = require('redux');
const {h, Component} = require('ink');

class Provider extends Component {
	render({children}) {
		return children;
	}

	getChildContext() {
		return {
			store: this.props.store
		};
	}
}

exports.Provider = Provider;

const defaultMergeProps = (stateProps, dispatchProps, ownProps) => {
	return Object.assign({}, ownProps, stateProps, dispatchProps);
};

const connect = (mapStateToProps, mapDispatchToProps, mergeProps = defaultMergeProps) => {
	return WrappedComponent => {
		class ConnectedComponent extends Component {
			render(ownProps, state, context) {
				const {dispatch, getState} = context.store;
				let stateProps;
				let dispatchProps;

				if (typeof mapStateToProps === 'function') {
					stateProps = mapStateToProps(getState(), ownProps);
				}

				if (mapDispatchToProps) {
					if (typeof mapDispatchToProps === 'function') {
						dispatchProps = mapDispatchToProps(dispatch, ownProps);
					}

					if (typeof mapDispatchToProps === 'object') {
						dispatchProps = bindActionCreators(mapDispatchToProps, dispatch);
					}
				} else {
					dispatchProps = {dispatch};
				}

				return <WrappedComponent {...mergeProps(stateProps, dispatchProps, ownProps)}/>;
			}

			componentDidMount() {
				if (typeof mapStateToProps === 'function') {
					this.unsubscribe = this.context.store.subscribe(() => {
						this.forceUpdate();
					});
				}
			}

			componentWillUnmount() {
				if (typeof this.unsubscribe === 'function') {
					this.unsubscribe();
				}
			}
		}

		return ConnectedComponent;
	};
};

exports.connect = connect;

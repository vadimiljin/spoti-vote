import React, {Component} from 'react';
import MediaQuery from 'react-responsive';
import socketIOClient from 'socket.io-client'
import Cookies from 'universal-cookie';
import swal from 'sweetalert2';
import Footer from '../components/App/Footer.jsx';
import Sidebar from '../components/App/Sidebar.jsx';
import CardContainer from '../components/App/Cards/CardContainer.jsx';

const constants = require('../js/constants');
const ipAddress = window.location.host || 'localhost';
const portFront = window.location.port || 80;
const portBack = 8888;

const cookies = new Cookies();

class App extends Component {
	constructor() {
		super();
		this.socket = socketIOClient('http://' + ipAddress + ':' + portBack);
		let token = cookies.get('token');
		if (token === undefined) {
			token = null;
		}

		this.state = {
			token: token,
			roomId: window.location.pathname.split('/')[2],
			loginPage: 'http://' + ipAddress + ':' + portFront,
			isHost: false,
			connectedUser: [],
			playlists: [],
			host: {
				name: null,
				voted: null
			},
			activePlaylist: {
				name: 'Loading',
				external_urls: {
					spotify: ''
				},
				images: [
					{
						url: ''
					}
				]
			},
			activeTracks: {},
			activePlayer: null
		}
	}

	componentDidMount() {
		document.title = "Spoti-Vote | " + this.state.roomId;
		document.getElementsByTagName("META")[2].content = "";

		//When the server asks for the id, it will return the id and the token
		this.socket.on('roomId', data => {
			this.socket.emit('roomId', {
				roomId: this.state.roomId,
				token: this.state.token
			});
		});

		//When the server asks for a name, the user is prompted with popups
		this.socket.on('nameEvent', data => { // SWAL
			swal({
				title: data.title,
				type: 'question',
				allowOutsideClick: false,
				allowEscapeKey: false,
				input: 'text',
				inputPlaceholder: 'Enter your name or nickname',
				inputValidator: (value) => {
					return new Promise((resolve) => {
						return resolve();
					});
				}
			}).then((result) => {
				this.socket.emit('nameEvent', {name: result.value});
			})
		});

		this.socket.on('initData', data => {
			if (data.token !== null && data.token !== undefined) {
				cookies.set('token', data.token, {path: '/'});

				this.setState({
					playlists: data.playlists,
					isHost: data.isHost,
					token: data.token,
					host: data.host,
					activeTracks: data.activeTracks,
					activePlaylist: data.activePlaylist,
					connectedUser: data.connectedUser,
					activePlayer: data.activePlayer
				});
			} else {
				this.setState({
					playlists: data.playlists,
					isHost: data.isHost,
					token: data.token,
					host: data.host,
					activeTracks: data.activeTracks,
					activePlaylist: data.activePlaylist,
					connectedUser: data.connectedUser,
					activePlayer: data.activePlayer
				});
			}
		});

		this.socket.on('update', data => {
			let newState = {};
			if (data.host !== null && data.host !== undefined) {
				console.log('Changing host');
				newState.host = {
					name: this.state.host.name,
					img: this.state.host.img,
					voted: data.host.voted
				}
			}

			if (data.activeTracks !== null && data.activeTracks !== undefined) {
				newState.activeTracks = data.activeTracks;
			}

			if (data.activePlaylist !== null && data.activePlaylist !== undefined) {
				newState.activePlaylist = data.activePlaylist;
			}

			if (data.connectedUser !== null && data.connectedUser !== undefined) {
				newState.connectedUser = data.connectedUser;
			}

			if (data.activePlayer !== null && data.activePlayer !== undefined) {
				if (data.activePlayer.track !== null && data.activePlayer.track !== undefined) {
					newState.activePlayer = data.activePlayer;
				} else {
					newState.activePlayer = {
						progress: data.activePlayer.progress,
						track: this.state.activePlayer.track
					}
				}
			}

			if (Object.keys(newState).length > 0) {
				this.setState({
					host: newState.host || this.state.host,
					activeTracks: newState.activeTracks || this.state.activeTracks,
					activePlaylist: newState.activePlaylist || this.state.activePlaylist,
					connectedUser: newState.connectedUser || this.state.connectedUser,
					activePlayer: newState.activePlayer || this.state.activePlayer
				})
			}
		});

		this.socket.on('errorEvent', data => {
			if (data.message !== null && data.message !== undefined) {
				swal({type: 'error', title: 'Oops...', text: data.message}).then((value) => {
					// console.log(value);
					this.socket.emit('logout');
					window.location.pathname = '/';
				});
			}
		});
	}

	selectPlaylist(event) {
		let playlistId = event.target.options[event.target.selectedIndex].getAttribute('id');
		if (playlistId !== null && playlistId !== 'none') {
			this.socket.emit('changePlaylist', {playlistId: playlistId});
		}
	}

	render() {
		return (<section style={{
				backgroundColor: constants.colors.background,
				height: '100vh',
				width: '100vw'
			}}>
			<MediaQuery minWidth={constants.breakpoints.medium}>{
					(matches) => {
						if (matches) {
							return (<Sidebar isPhone={false} socket={this.socket} isHost={this.state.isHost} connectedUser={this.state.connectedUser} host={this.state.host} playlistHandler={this.selectPlaylist.bind(this)} activePlaylist={this.state.activePlaylist} activeTracks={this.state.activeTracks} playlists={this.state.playlists}/>);
						} else {
							return (<Sidebar isPhone={true} socket={this.socket} isHost={this.state.isHost} connectedUser={this.state.connectedUser} host={this.state.host} playlistHandler={this.selectPlaylist.bind(this)} activePlaylist={this.state.activePlaylist} activeTracks={this.state.activeTracks} playlists={this.state.playlists}/>);
						}
					}
				}
			</MediaQuery>
			<MediaQuery minWidth={constants.breakpoints.medium}>{
					(matches) => {
						if (matches) { // = tablet^
							return <CardContainer isPhone={false} room={this.state.roomId} name={this.state.name} isHost={this.state.isHost} activeTracks={this.state.activeTracks} socket={this.socket}/>
						} else { // = phone
							return <CardContainer isPhone={true} room={this.state.roomId} name={this.state.name} isHost={this.state.isHost} activeTracks={this.state.activeTracks} socket={this.socket}/>
						}
					}
				}
			</MediaQuery>
			<Footer isHost={this.state.isHost} activePlayer={this.state.activePlayer} socket={this.socket}/>
		</section>);
	}
}

export default App;

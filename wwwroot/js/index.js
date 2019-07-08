'use strict';

const spotifyApi = new SpotifyWebApi();
const clientId = 'bb7f4eb61f1146fb83a11362641b6ebc';
const redirectUrl = 'https://fix-spotify.golf1052.com/api/spotify';

function authenticate() {
    let url = new URL('https://accounts.spotify.com/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', redirectUrl);
    url.searchParams.set('scope', 'user-library-read user-library-modify');
    window.location.href = url.toString();
}

$('#startButton').on('click', function() {
    authenticate();
});

let allTracks = [];
let albumMap = {};
let albumIds = [];
let unsavedAlbumIds = [];
let albumsToSaveIds = [];
let albumsTooLowIds = [];

let windowUrl = new URL(window.location.href.replace('#', '?'));
if (windowUrl.searchParams.has('accessToken')) {
    $('#startButton').attr('hidden', true);
    $('#progressBar').attr('hidden', false);
    spotifyApi.setAccessToken(windowUrl.searchParams.get('accessToken'));
    window.location.hash = '';
    getAllSavedTracks()
        .then(tracks => {
            allTracks = tracks;
            albumMap = createAlbumMap(tracks);
            albumIds = Object.keys(albumMap);
            return getAllSavedAlbums();
        })
        .then(albums => {
            let savedAlbumIds = [];
            albums.forEach(album => {
                savedAlbumIds.push(album.id);
            });
            albumIds.forEach(albumId => {
                if (!savedAlbumIds.includes(albumId)) {
                    unsavedAlbumIds.push(albumId);
                }
            });
            return getAllAlbums(unsavedAlbumIds);
        })
        .then(albums => {
            $('#progressBar').attr('hidden', true);
            let albumsToSave = [];
            let albumsTooLow = [];
            albums.forEach(album => {
                let tracks = album.tracks.total;
                let savedTracks = albumMap[album.id].length;
                if (savedTracks / tracks >= 0.25) {
                    albumsToSave.push(album);
                    albumsToSaveIds.push(album.id);
                } else {
                    albumsTooLow.push(album);
                    albumsTooLowIds.push(album.id);
                }
            });
            albumsToSave.sort(sortAlbums);
            albumsTooLow.sort(sortAlbums);
            displayAlbums(albumsToSave, albumsTooLow);
        });
} else if (windowUrl.searchParams.has('error')) {
    addAlert(windowUrl.searchParams.get('error'));
    window.location.hash = '';
}

function displayAlbums(albumsToSave, albumsTooLow) {
    let contentDiv = $('#content');
    createAppend(contentDiv, 'button')
        .addClass('btn btn-primary btn-block')
        .css('margin', '20px 0px')
        .attr('type', 'button')
        .text('Add all to Library (recommended and others)')
        .click(async function(event) {
            await saveAllAlbums(unsavedAlbumIds);
            unsavedAlbumIds = [];
            albumsToSaveIds = [];
            albumsTooLowIds = [];
            $(':button')
                .removeClass('btn-primary')
                .addClass('btn-success')
                .text('Added')
                .off('click')
                .prop('disabled', true);
            $('#addRecommendedButton')
                .removeClass('btn-primary')
                .addClass('btn-success')
                .text('All recommended albums added to Library')
                .off('click')
                .prop('disabled', true);
            $('#addOthersButton')
                .removeClass('btn-primary')
                .addClass('btn-success')
                .off('click')
                .prop('disabled', true)
                .text('All other albums added to Library');
            $(event.target)
                .text('All albums (recommended and others) added to Library');
        });
    createAppend(contentDiv, 'p')
        .addClass('text-center')
        .text(`You're missing ${albumsToSave.length + albumsTooLow.length} albums (${albumsToSave.length} recommended and ${albumsTooLow.length} other) from your Library. Isn't Spotify great?`);
    createAppend(contentDiv, 'h1')
        .addClass('text-center')
        .text('Recommended')
    createAppend(contentDiv, 'button')
        .attr('id', 'addRecommendedButton')
        .addClass('btn btn-primary btn-block')
        .css('margin', '10px 0px')
        .attr('type', 'button')
        .text('Add all recommended albums to Library')
        .click(async function(event) {
            await saveAllAlbums(albumsToSaveIds);
            albumsToSaveIds.forEach(albumId => {
                let index = unsavedAlbumIds.indexOf(albumId);
                if (index != -1) {
                    unsavedAlbumIds.splice(index, 1);
                }
            });
            albumsToSaveIds = [];
            $('.recommended')
                .removeClass('btn-primary')
                .addClass('btn-success')
                .text('Added')
                .off('click')
                .prop('disabled', true);
            $(event.target)
                .removeClass('btn-primary')
                .addClass('btn-success')
                .off('click')
                .prop('disabled', true)
                .text('All recommended albums added to Library');
            
        });
    createAppend(contentDiv, 'p')
        .addClass('text-center')
        .text("If you have 25% or more of an album's songs saved to your Library we recommended you add it back to your Library.");
    let cardDiv = null;
    for (let i = 0; i < albumsToSave.length; i++) {
        if (i % 6 == 0) {
            cardDiv = createAppend(contentDiv, 'div')
                .addClass('card-deck')
                .css('margin-bottom', '10px');
        }
        let album = albumsToSave[i];
        let card = createCard(album, 'recommended');
        cardDiv.append([card]);
    }
    createAppend(contentDiv, 'hr');
    createAppend(contentDiv, 'h1')
        .addClass('text-center')
        .text('Other');
    createAppend(contentDiv, 'button')
        .attr('id', 'addOthersButton')
        .addClass('btn btn-primary btn-block')
        .css('margin', '10px 0px')
        .attr('type', 'button')
        .text('Add all other albums to Library')
        .click(async function(event) {
            await saveAllAlbums(albumsTooLowIds);
            albumsTooLowIds.forEach(albumId => {
                let index = unsavedAlbumIds.indexOf(albumId);
                if (index != -1) {
                    unsavedAlbumIds.splice(index, 1);
                }
            });
            albumsTooLowIds = [];
            $('.other')
                .removeClass('btn-primary')
                .addClass('btn-success')
                .text('Added')
                .off('click')
                .prop('disabled', true);
            $(event.target)
                .removeClass('btn-primary')
                .addClass('btn-success')
                .off('click')
                .prop('disabled', true)
                .text('All other albums added to Library');
        });
    createAppend(contentDiv, 'p')
        .addClass('text-center')
        .text("If you have less than 25% of an album's songs saved to your Library, that album will appear below.");
    cardDiv = null;
    for (let i = 0; i < albumsTooLow.length; i++) {
        if (i % 6 == 0) {
            cardDiv = createAppend(contentDiv, 'div')
            .addClass('card-deck')
            .css('margin-bottom', '20px');
        }
        let album = albumsTooLow[i];
        let card = createCard(album, 'other');
        cardDiv.append([card]);
    }
}

function createCard(album, buttonClass) {
    let card = createElement('div')
        .addClass('card')
        .width('20rem');
    let albumImage = '';
    if (album.images.length > 0) {
        albumImage = album.images[0].url;
    }
    createAppend(card, 'img')
        .addClass('card-img-top')
        .attr('src', albumImage);
    let cardBody = createAppend(card, 'div')
        .addClass('card-body');
    createAppend(cardBody, 'h4')
        .addClass('card-title')
        .text(album.name);
    let albumArtist = '';
    if (album.artists.length > 0) {
        let albumArtists = album.artists.map(artist => {
            return artist.name;
        });
        albumArtist = `by ${albumArtists.join(', ')}`;
    }
    createAppend(cardBody, 'p')
        .addClass('card-text')
        .text(albumArtist);
    let cardFooter = createAppend(card, 'div')
        .addClass('card-footer');
    let addButton = createAppend(cardFooter, 'button')
        .addClass('btn btn-primary btn-block')
        .addClass(buttonClass)
        .attr('type', 'button')
        .text('Add to Library');
    addButton.click(function(event) {
            spotifyApi.addToMySavedAlbums([album.id], null, function(error, success) {
                if (error) {
                    console.log(error);
                } else {
                    let unsavedAlbumIdsIndex = unsavedAlbumIds.indexOf(album.id);
                    if (unsavedAlbumIdsIndex != -1) {
                        unsavedAlbumIds.splice(unsavedAlbumIdsIndex, 1);
                    }
                    let albumsToSaveIdsIndex = albumsToSaveIds.indexOf(album.id);
                    if (albumsToSaveIdsIndex != -1) {
                        albumsToSaveIds.splice(albumsToSaveIdsIndex, 1);
                    }
                    let albumsTooLowIdsIndex = albumsTooLowIds.indexOf(album.id);
                    if (albumsTooLowIdsIndex != -1) {
                        albumsTooLowIds.splice(albumsTooLowIdsIndex, 1);
                    }
                    $(event.target)
                        .removeClass('btn-primary')
                        .addClass('btn-success')
                        .text('Added')
                        .off('click')
                        .prop('disabled', true);
                }
            })
        });
    return card;
}

function createAppend(obj, tag) {
    let element = createElement(tag);
    obj.append([element]);
    return element;
}

function createElement(tag) {
    return $(`<${tag}></${tag}>`);
}

function sortAlbums(a1, a2) {
    return a1.name.localeCompare(a2.name);
}

async function getAllSavedTracks() {
    let tracks = [];
    let response = await spotifyApi.getMySavedTracks({
        limit: 50
    });
    response.items.forEach(item => {
        tracks.push(item.track);
    });

    while (response.next) {
        response = await spotifyApi.getMySavedTracks({
            limit: 50,
            offset: response.offset + response.items.length
        });
        response.items.forEach(item => {
            tracks.push(item.track);
        });
    }
    return tracks;
}

async function getAllSavedAlbums() {
    let albums = [];
    let response = await spotifyApi.getMySavedAlbums({
        limit: 50
    });
    response.items.forEach(item => {
        albums.push(item.album);
    });

    while (response.next) {
        response = await spotifyApi.getMySavedAlbums({
            limit: 50,
            offset: response.offset + response.items.length
        });
        response.items.forEach(item => {
            albums.push(item.album);
        });
    }
    return albums;
}

async function getAllAlbums(albumIds) {
    let albums = [];
    let checked = 0;
    while (checked < albumIds.length) {
        let slice = [];
        if (checked + 20 >= albumIds.length) {
            slice = albumIds.slice(checked);
            checked = albumIds.length;
        } else {
            slice = albumIds.slice(checked, checked + 20);
            checked += 20;
        }
        let response = await spotifyApi.getAlbums(slice);
        response.albums.forEach(album => {
            albums.push(album);
        });
    }
    return albums;
}

async function saveAllAlbums(albumIds) {
    let saved = 0;
    while (saved < albumIds.length) {
        const maxCount = 20;
        let slice = [];
        if (saved + maxCount >= albumIds.length) {
            slice = albumIds.slice(saved);
            saved = albumIds.length;
        } else {
            slice = albumIds.slice(saved, saved + maxCount);
            saved += maxCount;
        }
        let response = await spotifyApi.addToMySavedAlbums(slice)
            .catch(err => {
                console.log(err);
                // addAlert(err);
            })
    }
}

function createAlbumMap(tracks) {
    let albumMap = {};
    tracks.forEach(track => {
        if (!albumMap[track.album.id]) {
            albumMap[track.album.id] = [];
        }
        albumMap[track.album.id].push(track);
    });
    return albumMap;
}

function addAlert(text) {
    let alert = $('<div></div>').addClass('alert alert-danger').text(text);
    $('#alert-div').append([alert]);
}

function removeAlerts() {
    $('#alert-div').children().remove();
}

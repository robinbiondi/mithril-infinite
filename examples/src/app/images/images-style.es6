const image_position = '56px';
const toggle_size = '40px';

const styles = [{
    '.mithril-infinite__scroll-view.images': {
        margin: '0 auto',
        background: '#fff',

        ' .mithril-infinite__scroll-content': {
            ' .mithril-infinite__before, .mithril-infinite__after': {
                ' .list-item': {
                    padding: '20px 70px 20px ' + image_position,
                    'font-size': '16px',
                    'min-height': '60px'
                }
            },
            ' .mithril-infinite__page': {
                'min-height': '400px' // prevent 'after' content to show up on every scroll
            },
            ' .mithril-infinite__page + .mithril-infinite__page': {
                'border-top': '1px solid #ddd'
            },
            ' .mithril-infinite__page--odd': {
                'background-color': '#f0f0f0',

                ' .list-item + .list-item': {
                    'border-top': '1px solid #ddd'
                }
            },
            ' .mithril-infinite__page--even': {
                'background-color': '#e0e0e0',

                ' .list-item + .list-item': {
                    'border-top': '1px solid #ccc'
                }
            },
            ' .list-item': {
                position: 'relative',
                display: 'block',
                cursor: 'pointer',

                '.open': {
                    height: '160px'
                },
                '.closed': {
                    height: 'auto'
                },
                ' .image': {
                    display: 'block',
                    height: '100%',
                    position: 'absolute',
                    left: image_position,
                    top: 0,
                    'background-size': 'contain',
                    'background-repeat': 'no-repeat'
                },
                ' .pageNum, .toggle': {
                    position: 'absolute',
                    top: '8px',
                    display: 'block',
                    color: '#222',
                    width: toggle_size,
                    height: toggle_size,
                    'text-align': 'center',
                    'line-height': toggle_size
                },
                ' .pageNum': {
                    left: '4px',
                    'font-size': '13px',
                    color: '#999'
                },
                ' .toggle': {
                    right: '10px',
                    'background-color': '#fff'
                }
            }
        }
    }
}];

export default styles;
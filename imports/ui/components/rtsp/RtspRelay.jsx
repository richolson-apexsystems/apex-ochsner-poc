import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { loadPlayer } from 'rtsp-relay/browser';



/*
class RtspRelay extends React.Component {
  constructor(props) {
    super(props);
    
    
  const canvas = useRef<HTMLCanvasElement>(null);
  let cameraIP = 'home.zenzig.com';
  useEffect(() => {
    if (!canvas.current) throw new Error('Ref is null');

    loadPlayer({
      url: 'wss://localhost/api/stream/2',
      canvas: this.canvas.current,
    });
  }, []);    
    
    
    this.myRef = React.createRef();
  }
  render() {
    return (
        <canvas ref={this.myRef} /> 
        );
  }
}
export default RtspRelay;
*/

const RtspRelay = () => {
    return(
      
        <div>
           <h2>Hello World. I am RtspRelay component</h2>
        </div>
   );
};
export default RtspRelay;


/*
import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { loadPlayer } from 'rtsp-relay/browser';

export const Video = (props) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  let cameraIP = 'home.zenzig.com';
  useEffect(() => {
    if (!canvas.current) throw new Error('Ref is null');

    loadPlayer({
      url: 'ws://localhost/api/stream/2',
      canvas: canvas.current,
    });
  }, []);

  return <canvas ref={canvas} />;
};

*/
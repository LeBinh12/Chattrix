
export function isMobileDevice(): boolean {

  const hasTouch =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;


  const userAgent = navigator.userAgent.toLowerCase();
  const mobileUserAgents =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );

 
  const narrowViewport = window.innerWidth < 768;

 
  return (hasTouch || mobileUserAgents) && narrowViewport;
}

